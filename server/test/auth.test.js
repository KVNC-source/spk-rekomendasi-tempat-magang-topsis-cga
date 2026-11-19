import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createApp } from '../src/app.js';
import { createLoginLimiter } from '../src/lib/loginLimiter.js';
import { hashPassword } from '../src/lib/password.js';
import {
  PESAN_DIBATASI,
  PESAN_LOGIN_GAGAL,
  createAuthService,
  hashToken,
  normalisasiEmail,
} from '../src/services/auth.service.js';
import { AUTH_CONFIG, sendJson } from './helpers.js';

// A throw-away password for this run only; the accounts below exist only inside these tests.
const PASSWORD = randomBytes(9).toString('hex');
const HASH = await hashPassword(PASSWORD);

const userRow = (overrides) => ({
  user_id: 1,
  email: 'mhs@example.invalid',
  username: 'mhs',
  password: HASH,
  status: 'aktif',
  role: { nama_role: 'mahasiswa' },
  mahasiswa: { mahasiswa_id: 7, nama: 'Mhs Uji', nim: 'N-001' },
  ...overrides,
});

const USERS = [
  userRow(),
  userRow({ user_id: 2, email: 'admin@example.invalid', username: 'adm', role: { nama_role: 'administrator' }, mahasiswa: null }),
  userRow({ user_id: 3, email: 'nonaktif@example.invalid', username: 'off', status: 'nonaktif' }),
];

/** In-memory stand-in for the auth repository, with the same behaviour as the Prisma one. */
function fakeRepository() {
  const sesi = new Map();
  const calls = { hapusSesiKedaluwarsa: [] };
  return {
    sesi,
    calls,
    findUserByEmail: async (email) => USERS.find((u) => u.email === email) ?? null,
    buatSesi: async ({ userId, tokenHash, kedaluwarsaPada }) => {
      sesi.set(tokenHash, { user_id: userId, token_hash: tokenHash, kedaluwarsa_pada: kedaluwarsaPada });
    },
    findSesi: async (tokenHash) => {
      const s = sesi.get(tokenHash);
      return s ? { ...s, user: USERS.find((u) => u.user_id === s.user_id) } : null;
    },
    hapusSesi: async (tokenHash) => sesi.delete(tokenHash),
    hapusSesiKedaluwarsa: async (sekarang) => {
      calls.hapusSesiKedaluwarsa.push(sekarang);
      for (const [hash, s] of sesi) if (s.kedaluwarsa_pada <= sekarang) sesi.delete(hash);
    },
  };
}

/** A clock the tests can move forward. */
function buatKonteks() {
  let waktu = new Date('2026-11-19T00:00:00.000Z');
  const repository = fakeRepository();
  const limiter = createLoginLimiter({ now: () => waktu.getTime() });
  const authService = createAuthService({ repository, limiter, config: AUTH_CONFIG, now: () => waktu });
  return {
    repository,
    authService,
    maju: (menit) => (waktu = new Date(waktu.getTime() + menit * 60 * 1000)),
    sekarang: () => waktu,
  };
}

const masuk = (ctx, email, password = PASSWORD, ip = '10.0.0.1') => ctx.authService.masuk({ email, password, ip });
const gagal = (status, pesan) => (e) => e.status === status && e.message === pesan;

// --- login: success

test('login berhasil: returns a token, the user without the password, and stores only the token hash', async () => {
  const ctx = buatKonteks();
  const hasil = await masuk(ctx, 'mhs@example.invalid');

  assert.match(hasil.token, /^[A-Za-z0-9_-]{43}$/); // 32 random bytes, base64url
  assert.deepEqual(hasil.user, {
    user_id: 1,
    email: 'mhs@example.invalid',
    username: 'mhs',
    role: 'mahasiswa',
    mahasiswa_id: 7,
    nama: 'Mhs Uji',
    nim: 'N-001',
  });
  assert.ok(!JSON.stringify(hasil.user).includes('scrypt'));

  // the table holds the SHA-256 of the token, never the token itself
  const [tersimpan] = [...ctx.repository.sesi.values()];
  assert.equal(tersimpan.token_hash, createHash('sha256').update(hasil.token).digest('hex'));
  assert.notEqual(tersimpan.token_hash, hasil.token);
  assert.equal(tersimpan.user_id, 1);
});

test('login berhasil: the session lasts 8 hours', async () => {
  const ctx = buatKonteks();
  const { kedaluwarsaPada } = await masuk(ctx, 'mhs@example.invalid');
  assert.equal(kedaluwarsaPada.getTime() - ctx.sekarang().getTime(), 8 * 60 * 60 * 1000);
});

test('login berhasil: the email is trimmed and lower-cased; the administrator has no mahasiswa_id', async () => {
  const ctx = buatKonteks();
  assert.equal(normalisasiEmail('  MHS@Example.Invalid '), 'mhs@example.invalid');
  assert.equal((await masuk(ctx, '  MHS@Example.Invalid ')).user.email, 'mhs@example.invalid');

  const admin = (await masuk(ctx, 'admin@example.invalid')).user;
  assert.equal(admin.role, 'administrator');
  assert.equal(admin.mahasiswa_id, null);
  assert.equal(admin.nama, 'adm'); // no mahasiswa row: the username is shown
});

// --- login: failure

test('login gagal: wrong password, unknown email and inactive account all answer the same way', async () => {
  const ctx = buatKonteks();
  await assert.rejects(() => masuk(ctx, 'mhs@example.invalid', `${PASSWORD}x`), gagal(401, PESAN_LOGIN_GAGAL));
  await assert.rejects(() => masuk(ctx, 'tidak-ada@example.invalid'), gagal(401, PESAN_LOGIN_GAGAL));
  await assert.rejects(() => masuk(ctx, 'nonaktif@example.invalid'), gagal(401, PESAN_LOGIN_GAGAL));
  assert.equal(ctx.repository.sesi.size, 0); // no session was created
});

// --- login: limit

test('pembatasan: 5 failures block the 6th attempt with 429, also for an unregistered email', async () => {
  const ctx = buatKonteks();
  for (const email of ['mhs@example.invalid', 'tidak-ada@example.invalid']) {
    for (let i = 0; i < 5; i++) {
      await assert.rejects(() => masuk(ctx, email, 'salah'), gagal(401, PESAN_LOGIN_GAGAL));
    }
    // blocked: even the right password is refused, with the same message for both emails
    await assert.rejects(() => masuk(ctx, email), gagal(429, PESAN_DIBATASI));
  }
  assert.equal(PESAN_DIBATASI, 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.');
  assert.equal(ctx.repository.sesi.size, 0);
});

test('pembatasan: counted per IP + email; allowed again after 15 minutes', async () => {
  const ctx = buatKonteks();
  for (let i = 0; i < 5; i++) await assert.rejects(() => masuk(ctx, 'mhs@example.invalid', 'salah'));
  await assert.rejects(() => masuk(ctx, 'mhs@example.invalid'), gagal(429, PESAN_DIBATASI));

  // another IP, or another email, is not affected
  assert.ok((await masuk(ctx, 'mhs@example.invalid', PASSWORD, '10.0.0.2')).token);
  assert.ok((await masuk(ctx, 'admin@example.invalid')).token);

  ctx.maju(15);
  assert.ok((await masuk(ctx, 'mhs@example.invalid')).token);
});

test('pembatasan: a successful login clears the failures', async () => {
  const ctx = buatKonteks();
  for (let i = 0; i < 4; i++) await assert.rejects(() => masuk(ctx, 'mhs@example.invalid', 'salah'));
  await masuk(ctx, 'mhs@example.invalid');
  for (let i = 0; i < 4; i++) await assert.rejects(() => masuk(ctx, 'mhs@example.invalid', 'salah'), gagal(401, PESAN_LOGIN_GAGAL));
});

// --- sessions

test('sesi: a valid token gives the user; an unknown or empty one gives null', async () => {
  const ctx = buatKonteks();
  const { token } = await masuk(ctx, 'mhs@example.invalid');
  assert.equal((await ctx.authService.cariSesi(token)).email, 'mhs@example.invalid');
  assert.equal(await ctx.authService.cariSesi('bukan-token'), null);
  assert.equal(await ctx.authService.cariSesi(''), null);
  assert.equal(await ctx.authService.cariSesi(undefined), null);
});

test('sesi kedaluwarsa: rejected (null) once 8 hours have passed, and its row is removed', async () => {
  const ctx = buatKonteks();
  const { token } = await masuk(ctx, 'mhs@example.invalid');
  ctx.maju(8 * 60 - 1);
  assert.ok(await ctx.authService.cariSesi(token)); // still valid one minute before
  ctx.maju(1);
  assert.equal(await ctx.authService.cariSesi(token), null);
  assert.equal(ctx.repository.sesi.size, 0);
});

test('sesi kedaluwarsa: expired rows are deleted at every login, live ones are kept', async () => {
  const ctx = buatKonteks();
  const lama = await masuk(ctx, 'mhs@example.invalid');
  ctx.maju(9 * 60); // the first session has expired, but nobody used it again
  assert.equal(ctx.repository.sesi.size, 1);

  const baru = await masuk(ctx, 'admin@example.invalid');
  assert.equal(ctx.repository.calls.hapusSesiKedaluwarsa.length, 2); // once per login
  assert.equal(ctx.repository.sesi.size, 1);
  assert.equal(ctx.repository.sesi.has(hashToken(lama.token)), false);
  assert.equal(ctx.repository.sesi.has(hashToken(baru.token)), true);
});

test('sesi: an account that became inactive loses access', async () => {
  const ctx = buatKonteks();
  const { token } = await masuk(ctx, 'mhs@example.invalid');
  USERS[0].status = 'nonaktif';
  try {
    assert.equal(await ctx.authService.cariSesi(token), null);
  } finally {
    USERS[0].status = 'aktif';
  }
});

test('logout: removes the session, so the same token no longer works', async () => {
  const ctx = buatKonteks();
  const { token } = await masuk(ctx, 'mhs@example.invalid');
  await ctx.authService.keluar(token);
  assert.equal(ctx.repository.sesi.size, 0);
  assert.equal(await ctx.authService.cariSesi(token), null);
  await ctx.authService.keluar(token); // logging out twice is harmless
  await ctx.authService.keluar(undefined);
});

// --- HTTP (real auth service and middleware, fake database)

const stubService = {
  hitungRekomendasi: async () => ({ ok: true }),
  simpan: async () => ({ tempat_id: 'T05' }),
  ambil: async () => null,
  hapus: async () => {},
};
const kriteriaRows = [{ kode_kriteria: 'C1', nama_kriteria: 'Skor Kesesuaian Kompetensi', bobot: '0.3000', tipe: 'benefit' }];

async function withAuthApp(fn, { authConfig = AUTH_CONFIG } = {}) {
  const ctx = buatKonteks();
  const server = createApp({
    rekomendasiService: stubService,
    pilihanService: stubService,
    adminService: { daftarKriteria: async () => ({ kriteria: kriteriaRows.map((r) => ({ ...r, bobot: Number(r.bobot) })) }) },
    authService: ctx.authService,
    authConfig,
  }).listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`, ctx);
  } finally {
    server.close();
  }
}

const loginHttp = (base, email = 'mhs@example.invalid', password = PASSWORD, headers) =>
  sendJson('POST', `${base}/api/auth/login`, { email, password }, headers);

/** "sid=abc; Path=/; ..." → "sid=abc", ready to send back as a Cookie header. */
const bawaCookie = (res) => ({ cookie: res.headers.getSetCookie()[0].split(';')[0] });

test('POST /api/auth/login: 200 sets an httpOnly SameSite=Lax cookie of 8 hours and returns the user', async () => {
  await withAuthApp(async (base) => {
    const res = await loginHttp(base);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.email, 'mhs@example.invalid');
    assert.equal(body.user.role, 'mahasiswa');
    assert.ok(!('password' in body.user) && !('token' in body));

    const [setCookie] = res.headers.getSetCookie();
    assert.match(setCookie, /^sid=[A-Za-z0-9_-]{43};/);
    for (const part of ['HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=28800']) assert.ok(setCookie.includes(part), part);
    assert.ok(!setCookie.includes('Secure')); // only in production

    // the cookie opens the session
    const me = await fetch(`${base}/api/auth/me`, { headers: bawaCookie(res) });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.email, 'mhs@example.invalid');
  });
});

test('POST /api/auth/login: the cookie is Secure in production', async () => {
  await withAuthApp(
    async (base) => {
      const res = await loginHttp(base);
      assert.ok(res.headers.getSetCookie()[0].includes('Secure'));
    },
    { authConfig: { ...AUTH_CONFIG, secureCookie: true } }
  );
});

test('POST /api/auth/login: 401 with one message for a wrong password and an unknown email; no cookie', async () => {
  await withAuthApp(async (base) => {
    for (const [email, password] of [
      ['mhs@example.invalid', 'salah'],
      ['tidak-ada@example.invalid', PASSWORD],
    ]) {
      const res = await loginHttp(base, email, password);
      assert.equal(res.status, 401);
      assert.deepEqual(await res.json(), { error: PESAN_LOGIN_GAGAL });
      assert.deepEqual(res.headers.getSetCookie(), []);
    }
  });
});

test('POST /api/auth/login: 400 for a missing or malformed body', async () => {
  await withAuthApp(async (base) => {
    for (const body of [{}, { email: 'mhs@example.invalid' }, { password: 'x' }, { email: '  ', password: 'x' }, { email: 5, password: 'x' }, '{oops']) {
      assert.equal((await sendJson('POST', `${base}/api/auth/login`, body)).status, 400, JSON.stringify(body));
    }
  });
});

test('POST /api/auth/login: 429 with the message after 5 failures', async () => {
  await withAuthApp(async (base) => {
    for (let i = 0; i < 5; i++) assert.equal((await loginHttp(base, 'mhs@example.invalid', 'salah')).status, 401);
    const res = await loginHttp(base);
    assert.equal(res.status, 429);
    assert.deepEqual(await res.json(), { error: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' });
    // an email that is not registered is limited in the same way
    for (let i = 0; i < 5; i++) await loginHttp(base, 'tidak-ada@example.invalid', 'salah');
    assert.equal((await loginHttp(base, 'tidak-ada@example.invalid', 'salah')).status, 429);
  });
});

test('GET /api/auth/me: 401 without a cookie or with an unknown token', async () => {
  await withAuthApp(async (base) => {
    assert.equal((await fetch(`${base}/api/auth/me`)).status, 401);
    assert.equal((await fetch(`${base}/api/auth/me`, { headers: { cookie: 'sid=palsu' } })).status, 401);
  });
});

test('POST /api/auth/logout: 204, clears the cookie, and the old cookie stops working', async () => {
  await withAuthApp(async (base) => {
    const cookie = bawaCookie(await loginHttp(base));
    assert.equal((await fetch(`${base}/api/auth/me`, { headers: cookie })).status, 200);

    const res = await sendJson('POST', `${base}/api/auth/logout`, undefined, cookie);
    assert.equal(res.status, 204);
    const [hapus] = res.headers.getSetCookie();
    assert.ok(hapus.startsWith('sid=;') && hapus.includes('Max-Age=0'));

    // the server has dropped the session: the same cookie is refused
    assert.equal((await fetch(`${base}/api/auth/me`, { headers: cookie })).status, 401);
    assert.equal((await sendJson('POST', `${base}/api/auth/logout`, undefined, cookie)).status, 401);
  });
});

test('sesi kedaluwarsa: 401 over HTTP after 8 hours', async () => {
  await withAuthApp(async (base, ctx) => {
    const cookie = bawaCookie(await loginHttp(base));
    ctx.maju(8 * 60 + 1);
    const res = await fetch(`${base}/api/auth/me`, { headers: cookie });
    assert.equal(res.status, 401);
    assert.equal(ctx.repository.sesi.size, 0);
  });
});

test('hak akses: no session is 401, the wrong role is 403, the right role gets through', async () => {
  await withAuthApp(async (base) => {
    const mahasiswa = bawaCookie(await loginHttp(base, 'mhs@example.invalid'));
    const admin = bawaCookie(await loginHttp(base, 'admin@example.invalid'));

    // administrator area
    assert.equal((await fetch(`${base}/api/admin/kriteria`)).status, 401);
    assert.equal((await fetch(`${base}/api/admin/kriteria`, { headers: mahasiswa })).status, 403);
    const ok = await fetch(`${base}/api/admin/kriteria`, { headers: admin });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { kriteria: [{ kode_kriteria: 'C1', nama_kriteria: 'Skor Kesesuaian Kompetensi', bobot: 0.3, tipe: 'benefit' }] });

    // mahasiswa area
    for (const [method, path] of [['POST', '/api/rekomendasi'], ['GET', '/api/pilihan'], ['PUT', '/api/pilihan'], ['DELETE', '/api/pilihan']]) {
      const lihat = (headers) => sendJson(method, `${base}${path}`, method === 'PUT' ? { tempat_id: 'T05' } : undefined, headers);
      assert.equal((await lihat({})).status, 401, `${method} ${path} tanpa sesi`);
      assert.equal((await lihat(admin)).status, 403, `${method} ${path} sebagai administrator`);
      assert.notEqual((await lihat(mahasiswa)).status, 403, `${method} ${path} sebagai mahasiswa`);
    }
  });
});

test('Origin: refused (403) only when the header is present and is not the client; no Origin passes', async () => {
  await withAuthApp(async (base) => {
    const asing = await loginHttp(base, 'mhs@example.invalid', PASSWORD, { origin: 'http://evil.example' });
    assert.equal(asing.status, 403);
    assert.deepEqual(asing.headers.getSetCookie(), []); // no session was started

    const klien = await loginHttp(base, 'mhs@example.invalid', PASSWORD, { origin: AUTH_CONFIG.clientOrigin });
    assert.equal(klien.status, 200);

    const tanpaOrigin = await loginHttp(base, 'admin@example.invalid'); // Postman, curl
    assert.equal(tanpaOrigin.status, 200);

    // a foreign Origin is also refused on a state-changing call that already has a session
    const cookie = bawaCookie(klien);
    const logoutAsing = await sendJson('POST', `${base}/api/auth/logout`, undefined, { ...cookie, origin: 'http://evil.example' });
    assert.equal(logoutAsing.status, 403);
    assert.equal((await fetch(`${base}/api/auth/me`, { headers: cookie })).status, 200); // still signed in
  });
});

test('CORS: only the client origin may send credentials', async () => {
  await withAuthApp(async (base) => {
    const dariKlien = await fetch(`${base}/api/health`, { headers: { origin: AUTH_CONFIG.clientOrigin } });
    assert.equal(dariKlien.headers.get('access-control-allow-origin'), AUTH_CONFIG.clientOrigin);
    assert.equal(dariKlien.headers.get('access-control-allow-credentials'), 'true');

    const dariLain = await fetch(`${base}/api/health`, { headers: { origin: 'http://evil.example' } });
    assert.notEqual(dariLain.headers.get('access-control-allow-origin'), 'http://evil.example');
    assert.notEqual(dariLain.headers.get('access-control-allow-origin'), '*');
  });
});
