/**
 * Authentication settings, read from the environment (server/.env).
 * Passwords are never configured here: the seed reads SEED_PASSWORD_* itself.
 */
export function getAuthConfig(env = process.env) {
  const clientOrigin = env.CLIENT_ORIGIN?.trim();
  if (!clientOrigin) {
    throw new Error('CLIENT_ORIGIN belum diisi di .env (asal klien, misalnya http://localhost:5173)');
  }

  const sessionHours = env.SESSION_HOURS === undefined || env.SESSION_HOURS === '' ? 8 : Number(env.SESSION_HOURS);
  if (!Number.isFinite(sessionHours) || sessionHours <= 0) {
    throw new Error(`SESSION_HOURS harus berupa angka lebih dari 0, ditemukan "${env.SESSION_HOURS}"`);
  }

  return {
    clientOrigin,
    sessionHours,
    cookieName: 'sid',
    secureCookie: env.NODE_ENV === 'production',
    maxAttempts: 5,
    lockMinutes: 15,
  };
}

export const ROLE_MAHASISWA = 'mahasiswa';
export const ROLE_ADMINISTRATOR = 'administrator';
