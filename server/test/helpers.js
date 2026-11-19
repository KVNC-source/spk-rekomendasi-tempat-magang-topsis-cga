import { createApp } from '../src/app.js';

export const AUTH_CONFIG = {
  clientOrigin: 'http://localhost:5173',
  sessionHours: 8,
  cookieName: 'sid',
  secureCookie: false,
  maxAttempts: 5,
  lockMinutes: 15,
};

export const MAHASISWA = {
  user_id: 10,
  email: 'mhs@example.invalid',
  username: 'mhs',
  role: 'mahasiswa',
  mahasiswa_id: 7,
  nama: 'Mhs Uji',
  nim: 'N-001',
};
export const ADMIN = {
  user_id: 11,
  email: 'admin@example.invalid',
  username: 'adm',
  role: 'administrator',
  mahasiswa_id: null,
  nama: 'adm',
  nim: null,
};

/** A stand-in for the auth service: the cookie token picks who is signed in. */
export function fakeAuthService() {
  const sessions = { 'tok-mhs': MAHASISWA, 'tok-admin': ADMIN };
  return {
    cariSesi: async (token) => sessions[token] ?? null,
    keluar: async () => {},
    masuk: async () => {
      throw new Error('not used in these tests');
    },
  };
}

export const cookie = (token) => ({ cookie: `sid=${token}` });

/** Starts the app on a free port with fake services, runs `fn(baseUrl)`, then stops it. */
export async function withApp(services, fn, authConfig = AUTH_CONFIG) {
  const server = createApp({
    rekomendasiService: {},
    pilihanService: {},
    adminService: {},
    authService: fakeAuthService(),
    authConfig,
    ...services,
  }).listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

export const sendJson = (method, url, body, headers = {}) =>
  fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
