/**
 * Business Logic Layer — login, logout and session lookup.
 *
 * - Login is by email + password. The email is trimmed and lower-cased.
 * - Every failure answers the same way (401, same message), whether the email
 *   is unknown, the password is wrong or the account is not active. A password
 *   check is also done for an unknown email so the time taken does not tell.
 * - Failed logins are limited per IP + email (429), also for unknown emails.
 * - The browser keeps a random token; only its SHA-256 hash is stored.
 */
import { createHash, randomBytes } from 'node:crypto';
import { HttpError } from '../lib/httpError.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

export const PESAN_LOGIN_GAGAL = 'Email atau kata sandi salah.';
export const PESAN_DIBATASI = 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.';

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

export function createAuthService({ repository, limiter, config, now = () => new Date() }) {
  // Checked against when the email is unknown, so both paths cost the same time.
  let hashPalsu;
  const ambilHashPalsu = () => (hashPalsu ??= hashPassword(randomBytes(16).toString('hex')));

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
      const sekarang = now();
      await repository.hapusSesiKedaluwarsa(sekarang);

      const token = randomBytes(32).toString('base64url');
      const kedaluwarsaPada = new Date(sekarang.getTime() + config.sessionHours * 3600 * 1000);
      await repository.buatSesi({ userId: user.user_id, tokenHash: hashToken(token), kedaluwarsaPada });

      return { token, kedaluwarsaPada, user: ubahKePengguna(user) };
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
