/**
 * What `npm run seed` is allowed to do, decided from the environment alone (so a test can run it).
 *
 *  - Laptop (no NODE_ENV=production): as before. Both CONTOH accounts are created; the passwords
 *    must be filled in (8 characters or more only gets a warning).
 *  - Production (NODE_ENV=production): the administrator password must have 12 characters or more.
 *    The CONTOH mahasiswa account and its sample profile are NOT created, unless SEED_AKUN_CONTOH=ya
 *    (for a demo); then SEED_PASSWORD_MAHASISWA must be 12 characters or more too, because that
 *    email is written in the repository.
 *  - SEED_ADMIN_EMAIL (optional) is the administrator's login email; it defaults to the CONTOH one.
 */
import { normalisasiEmail } from '../services/validasi-daftar.js';

export const MIN_PASSWORD_PRODUKSI = 12;
export const EMAIL_ADMIN_BAWAAN = 'contoh-admin@example.invalid';

const BENTUK_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {Record<string, string|undefined>} env
 * @returns {{ production: boolean, buatAkunContoh: boolean, emailAdmin: string, usernameAdmin: string,
 *            kesalahan: string[], peringatan: string[] }}
 */
export function rencanaSeed(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const kesalahan = [];
  const peringatan = [];

  const pilihanContoh = (env.SEED_AKUN_CONTOH ?? '').trim().toLowerCase();
  if (!['', 'ya', 'tidak'].includes(pilihanContoh)) {
    kesalahan.push('SEED_AKUN_CONTOH hanya boleh "ya" atau kosong.');
  }
  const buatAkunContoh = !production || pilihanContoh === 'ya';

  const emailMentah = normalisasiEmail(env.SEED_ADMIN_EMAIL ?? '');
  if (emailMentah !== '' && (!BENTUK_EMAIL.test(emailMentah) || emailMentah.length > 255)) {
    kesalahan.push('SEED_ADMIN_EMAIL bukan alamat email yang sah.');
  }
  const emailAdmin = emailMentah !== '' ? emailMentah : EMAIL_ADMIN_BAWAAN;
  const usernameAdmin = emailAdmin === EMAIL_ADMIN_BAWAAN ? 'contoh-admin' : emailAdmin.split('@')[0].slice(0, 100);

  const passwordAdmin = env.SEED_PASSWORD_ADMIN ?? '';
  const passwordMahasiswa = env.SEED_PASSWORD_MAHASISWA ?? '';
  const diperlukan = [
    ['SEED_PASSWORD_ADMIN', passwordAdmin],
    ...(buatAkunContoh ? [['SEED_PASSWORD_MAHASISWA', passwordMahasiswa]] : []),
  ];
  const kosong = diperlukan.filter(([, nilai]) => nilai === '').map(([nama]) => nama);
  if (kosong.length > 0) kesalahan.push(`${kosong.join(' dan ')} belum diisi. Isi dulu, lalu jalankan lagi.`);

  for (const [nama, nilai] of diperlukan.filter(([, nilai]) => nilai !== '')) {
    if (production && nilai.length < MIN_PASSWORD_PRODUKSI) {
      kesalahan.push(`Di produksi ${nama} minimal ${MIN_PASSWORD_PRODUKSI} karakter.`);
    } else if (!production && nilai.length < 8) {
      peringatan.push(`${nama} kurang dari 8 karakter. Cukup untuk pengembangan, jangan dipakai di tempat lain.`);
    }
  }
  if (production && emailAdmin === EMAIL_ADMIN_BAWAAN) {
    peringatan.push(
      `Administrator memakai email bawaan ${EMAIL_ADMIN_BAWAAN}, yang tertulis di repositori. Isi SEED_ADMIN_EMAIL dengan email lain.`
    );
  }

  return { production, buatAkunContoh, emailAdmin, usernameAdmin, kesalahan, peringatan };
}
