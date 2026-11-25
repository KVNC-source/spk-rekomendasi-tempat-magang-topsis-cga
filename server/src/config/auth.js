const HOST_LOKAL = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * CLIENT_ORIGIN as the browser writes it in the Origin header: scheme + host (+ port), no path, no
 * trailing slash, lower-case host. The Origin check compares text, so `https://x.onrender.com/` would
 * refuse every POST. In production it must be https (a laptop's localhost is the one exception, so the
 * production build can be tried locally).
 */
export function normalisasiAsal(mentah, production = false) {
  const teks = String(mentah ?? '').trim().replace(/\/+$/, '');
  let url;
  try {
    url = new URL(teks);
  } catch {
    throw new Error(`CLIENT_ORIGIN bukan alamat yang sah: "${teks}". Tulis seperti https://nama-situs.onrender.com`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username) {
    throw new Error(`CLIENT_ORIGIN harus berisi alamat situsnya saja, tanpa jalur (path): "${teks}"`);
  }
  if (production && url.protocol !== 'https:' && !HOST_LOKAL.has(url.hostname)) {
    throw new Error(`CLIENT_ORIGIN di produksi harus memakai https://, ditemukan "${teks}"`);
  }
  return url.origin;
}

/**
 * Authentication settings, read from the environment (server/.env).
 * Passwords are never configured here: the seed reads SEED_PASSWORD_* itself.
 */
export function getAuthConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const mentah = env.CLIENT_ORIGIN?.trim();
  if (!mentah) {
    throw new Error('CLIENT_ORIGIN belum diisi di .env (asal klien, misalnya http://localhost:5173)');
  }
  const clientOrigin = normalisasiAsal(mentah, production);

  const sessionHours = env.SESSION_HOURS === undefined || env.SESSION_HOURS === '' ? 8 : Number(env.SESSION_HOURS);
  if (!Number.isFinite(sessionHours) || sessionHours <= 0) {
    throw new Error(`SESSION_HOURS harus berupa angka lebih dari 0, ditemukan "${env.SESSION_HOURS}"`);
  }

  // Successful self-registrations allowed per IP per hour. Students sitting on one network share
  // an IP, so raise it (DAFTAR_MAKS_PER_JAM in .env) before a group session.
  const daftarMaksPerJam = env.DAFTAR_MAKS_PER_JAM === undefined || env.DAFTAR_MAKS_PER_JAM === '' ? 5 : Number(env.DAFTAR_MAKS_PER_JAM);
  if (!Number.isInteger(daftarMaksPerJam) || daftarMaksPerJam <= 0) {
    throw new Error(`DAFTAR_MAKS_PER_JAM harus berupa bilangan bulat lebih dari 0, ditemukan "${env.DAFTAR_MAKS_PER_JAM}"`);
  }

  return {
    clientOrigin,
    sessionHours,
    cookieName: 'sid',
    secureCookie: production,
    maxAttempts: 5,
    lockMinutes: 15,
    daftarMaksPerJam,
  };
}

export const ROLE_MAHASISWA = 'mahasiswa';
export const ROLE_ADMINISTRATOR = 'administrator';
