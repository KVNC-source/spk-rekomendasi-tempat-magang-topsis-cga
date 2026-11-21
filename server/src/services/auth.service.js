/**
 * Business Logic Layer — login, logout and session lookup.
 *
 * - Login is by email + password. The email is trimmed and lower-cased.
 * - Every failure answers the same way (401, same message), whether the email
 *   is unknown, the password is wrong or the account is not active. A password
 *   check is also done for an unknown email so the time taken does not tell.
 * - Failed logins are limited per IP + email (429), also for unknown emails.
 * - The browser keeps a random token; only its SHA-256 hash is stored.
 * - Self-registration (daftar) is for mahasiswa only. It creates the users row and the
 *   mahasiswa row in one transaction, then starts a session exactly like a login.
 */
import { createHash, randomBytes } from 'node:crypto';
import { HttpError } from '../lib/httpError.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { ROLE_MAHASISWA } from '../config/auth.js';
import { validasiDaftar } from './validasi-daftar.js';

export const PESAN_LOGIN_GAGAL = 'Email atau kata sandi salah.';
export const PESAN_DIBATASI = 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.';
export const PESAN_PENDAFTARAN_DIBATASI = 'Terlalu banyak pendaftaran dari jaringan ini. Coba lagi dalam 1 jam.';

export const PESAN_EMAIL_ADA = 'Email ini sudah terdaftar. Silakan masuk.';
export const PESAN_NIM_ADA = 'NIM ini sudah terdaftar. Kalau itu NIM-mu, silakan masuk atau hubungi peneliti.';

const STATUS_AKTIF = 'aktif';

export const normalisasiEmail = (email) => String(email ?? '').trim().toLowerCase();
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

/** User row → what the client may see. Never the password hash. */
export function ubahKePengguna(user) {
  return {
    user_id: user.user_id,
    email: user.email,
    username: user.username,
    role: user.role.nama_role,
    mahasiswa_id: user.mahasiswa?.mahasiswa_id ?? null,
    nama: user.mahasiswa?.nama ?? user.username,
    nim: user.mahasiswa?.nim ?? null,
  };
}

/**
 * @param {object} deps
 * @param {object} deps.limiter              failed-login limiter
 * @param {object} [deps.pendaftaranLimiter] limits successful registrations per IP (in memory)
 */
export function createAuthService({ repository, limiter, pendaftaranLimiter, config, now = () => new Date() }) {
  // Checked against when the email is unknown, so both paths cost the same time.
  let hashPalsu;
  const ambilHashPalsu = () => (hashPalsu ??= hashPassword(randomBytes(16).toString('hex')));

  /** Stores a new session for the user and returns what the controller needs for the cookie. */
  async function mulaiSesi(user) {
    const sekarang = now();
    await repository.hapusSesiKedaluwarsa(sekarang);
    const token = randomBytes(32).toString('base64url');
    const kedaluwarsaPada = new Date(sekarang.getTime() + config.sessionHours * 3600 * 1000);
    await repository.buatSesi({ userId: user.user_id, tokenHash: hashToken(token), kedaluwarsaPada });
    return { token, kedaluwarsaPada, user: ubahKePengguna(user) };
  }

  return {
    async masuk({ email, password, ip }) {
      const emailBersih = normalisasiEmail(email);
      const kunci = `${ip}|${emailBersih}`;

      if (limiter.isBlocked(kunci)) throw new HttpError(429, PESAN_DIBATASI);

      const user = await repository.findUserByEmail(emailBersih);
      const cocok = await verifyPassword(password, user ? user.password : await ambilHashPalsu());
      if (!user || !cocok || user.status !== STATUS_AKTIF) {
        limiter.recordFailure(kunci);
        throw new HttpError(401, PESAN_LOGIN_GAGAL);
      }

      limiter.reset(kunci);
      return mulaiSesi(user);
    },

    /**
     * Self-registration. Always a mahasiswa with status 'aktif': the role comes from
     * ROLE_MAHASISWA, never from the body (only the fields validasiDaftar returns are used).
     * Only successful registrations count toward the per-IP limit.
     */
    async daftar({ body, ip }) {
      if (pendaftaranLimiter?.isBlocked(ip)) throw new HttpError(429, PESAN_PENDAFTARAN_DIBATASI);

      const sekarang = now();
      const { data, kesalahan } = validasiDaftar(body, { sekarang });
      if (Object.keys(kesalahan).length > 0) {
        throw new HttpError(422, 'Pendaftaran belum bisa diproses. Periksa isian yang bertanda salah.', { kesalahan });
      }

      // Friendly duplicate messages, per field. The unique indexes still decide when two requests race.
      const [emailAda, nimAda] = await Promise.all([
        repository.findUserByEmail(data.email),
        repository.findMahasiswaByNim(data.nim),
      ]);
      const duplikat = {};
      if (emailAda) duplikat.email = PESAN_EMAIL_ADA;
      if (nimAda) duplikat.nim = PESAN_NIM_ADA;
      if (Object.keys(duplikat).length > 0) throw new HttpError(409, 'Email atau NIM sudah terdaftar.', { kesalahan: duplikat });

      let user;
      try {
        user = await repository.buatAkunMahasiswa({
          namaRole: ROLE_MAHASISWA,
          email: data.email,
          username: data.nama.slice(0, 100),
          passwordHash: await hashPassword(data.password),
          nama: data.nama,
          nim: data.nim,
          angkatan: data.angkatan,
          persetujuanPada: sekarang,
        });
      } catch (err) {
        // Two requests with the same email or NIM at the same moment: the database's unique index says no.
        if (err?.code === 'P2002') {
          const sasaran = String(err.meta?.target ?? '');
          const kunci = {};
          if (sasaran.includes('nim')) kunci.nim = PESAN_NIM_ADA;
          if (sasaran.includes('email') || Object.keys(kunci).length === 0) kunci.email = PESAN_EMAIL_ADA;
          throw new HttpError(409, 'Email atau NIM sudah terdaftar.', { kesalahan: kunci });
        }
        throw err;
      }

      pendaftaranLimiter?.recordFailure(ip); // "failure" is the limiter's word for "one counted attempt"
      return mulaiSesi(user);
    },

    /** The signed-in user for a cookie token, or null (no session, unknown, expired, inactive account). */
    async cariSesi(token) {
      if (typeof token !== 'string' || token === '') return null;
      const tokenHash = hashToken(token);
      const sesi = await repository.findSesi(tokenHash);
      if (!sesi) return null;
      if (sesi.kedaluwarsa_pada.getTime() <= now().getTime()) {
        await repository.hapusSesi(tokenHash);
        return null;
      }
      if (sesi.user.status !== STATUS_AKTIF) return null;
      return ubahKePengguna(sesi.user);
    },

    async keluar(token) {
      if (typeof token === 'string' && token !== '') await repository.hapusSesi(hashToken(token));
    },
  };
}
