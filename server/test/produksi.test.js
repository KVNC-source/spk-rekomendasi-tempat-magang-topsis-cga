import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { getAuthConfig, normalisasiAsal } from '../src/config/auth.js';
import { bacaTrustProxy, getServerConfig } from '../src/config/server.js';
import { catatGalat, samarkan } from '../src/lib/catatGalat.js';
import { targetDatabase, teksTarget } from '../src/lib/dbTarget.js';
import { rencanaSeed } from '../src/lib/aturanSeed.js';
import { CSP } from '../src/middleware/securityHeaders.js';
import { AUTH_CONFIG, cookie, fakeAuthService, sendJson } from './helpers.js';

// ---- TRUST_PROXY and the server settings ------------------------------------------------------

test('TRUST_PROXY: empty or false means no proxy; a number is a hop count; true stays true', () => {
  assert.equal(bacaTrustProxy(undefined), false);
  assert.equal(bacaTrustProxy(''), false);
  assert.equal(bacaTrustProxy('  '), false);
  assert.equal(bacaTrustProxy('false'), false);
  assert.equal(bacaTrustProxy('0'), false);
  assert.equal(bacaTrustProxy('1'), 1);
  assert.equal(bacaTrustProxy(' 2 '), 2);
  assert.equal(bacaTrustProxy('true'), true);
  assert.equal(bacaTrustProxy('loopback'), 'loopback');
});

test('getServerConfig: a laptop serves no client; production serves client/dist (or CLIENT_DIST)', () => {
  assert.deepEqual(getServerConfig({}), { production: false, trustProxy: false, clientDir: null });
  const prod = getServerConfig({ NODE_ENV: 'production', TRUST_PROXY: '1' });
  assert.equal(prod.production, true);
  assert.equal(prod.trustProxy, 1);
  assert.match(prod.clientDir.replaceAll('\\', '/'), /\/client\/dist$/);
  assert.equal(getServerConfig({ NODE_ENV: 'production', CLIENT_DIST: '/srv/web' }).clientDir, '/srv/web');
});

test('TRUST_PROXY decides which IP the server sees: ignored without a proxy, used with one', async () => {
  const lihat = async (trustProxy) => {
    const ips = [];
    const authService = { ...fakeAuthService(), masuk: async ({ ip }) => (ips.push(ip), Promise.reject(new Error('stop'))) };
    const server = createApp({
      rekomendasiService: {},
      pilihanService: {},
      adminService: {},
      authService,
      authConfig: AUTH_CONFIG,
      serverConfig: { trustProxy },
    }).listen(0);
    try {
      await sendJson('POST', `http://127.0.0.1:${server.address().port}/api/auth/login`, { email: 'a@b.c', password: 'x' }, { 'x-forwarded-for': '203.0.113.9' });
    } finally {
      server.close();
    }
    return ips[0];
  };
  // without a proxy the header is just text a visitor wrote: it must NOT become the IP
  assert.match(await lihat(false), /127\.0\.0\.1$/);
  // one proxy in front: the address that proxy saw is the visitor's
  assert.equal(await lihat(1), '203.0.113.9');
});

test('createApp refuses a TRUST_PROXY value Express cannot read, with a clear message', () => {
  assert.throws(
    () => createApp({ rekomendasiService: {}, pilihanService: {}, adminService: {}, authService: fakeAuthService(), authConfig: AUTH_CONFIG, serverConfig: { trustProxy: 'bukan alamat' } }),
    /TRUST_PROXY tidak dikenali/
  );
});

// ---- CLIENT_ORIGIN -----------------------------------------------------------------------------

test('CLIENT_ORIGIN is written the way the browser sends it in Origin: no trailing slash, lower-case host', () => {
  assert.equal(normalisasiAsal('http://localhost:5173'), 'http://localhost:5173');
  assert.equal(normalisasiAsal(' https://SPK-Magang.onrender.com/ '), 'https://spk-magang.onrender.com');
  assert.equal(normalisasiAsal('https://spk.onrender.com:443'), 'https://spk.onrender.com');
  assert.equal(getAuthConfig({ CLIENT_ORIGIN: 'https://x.onrender.com/' }).clientOrigin, 'https://x.onrender.com');
});

test('CLIENT_ORIGIN must be only an address; in production it must be https (localhost excepted)', () => {
  for (const salah of ['bukan alamat', 'https://x.onrender.com/masuk', 'https://x.onrender.com/?a=1', 'ftp://x.onrender.com']) {
    assert.throws(() => normalisasiAsal(salah), /CLIENT_ORIGIN/, salah);
  }
  assert.throws(() => getAuthConfig({ NODE_ENV: 'production', CLIENT_ORIGIN: 'http://spk.example.com' }), /harus memakai https/);
  assert.equal(getAuthConfig({ NODE_ENV: 'production', CLIENT_ORIGIN: 'https://spk.example.com' }).secureCookie, true);
  // the production build can be tried on a laptop
  assert.equal(getAuthConfig({ NODE_ENV: 'production', CLIENT_ORIGIN: 'http://localhost:5002' }).clientOrigin, 'http://localhost:5002');
  assert.equal(getAuthConfig({ CLIENT_ORIGIN: 'http://localhost:5173' }).secureCookie, false);
  assert.throws(() => getAuthConfig({}), /CLIENT_ORIGIN belum diisi/);
});

// ---- one address: the client, the fallback, headers, the API ---------------------------------

const ASAL = 'https://spk.example.com';
const authConfigProduksi = { ...AUTH_CONFIG, clientOrigin: ASAL, secureCookie: true };

async function denganProduksi(fn, { services = {}, production = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'spk-dist-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>SPK Magang</title><div id="root"></div>');
  writeFileSync(join(dir, 'assets', 'index-abc123.js'), 'console.log(1)');
  writeFileSync(join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const server = createApp({
    rekomendasiService: {},
    pilihanService: {},
    adminService: {},
    authService: fakeAuthService(),
    authConfig: authConfigProduksi,
    serverConfig: { production, trustProxy: 1, clientDir: production ? dir : null },
    ...services,
  }).listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test('production: client routes get index.html (and the file routes do not)', async () => {
  await denganProduksi(async (base) => {
    for (const rute of ['/', '/masuk', '/daftar', '/mahasiswa/beranda', '/mahasiswa/rekomendasi/T05', '/admin/tempat']) {
      const res = await fetch(base + rute);
      assert.equal(res.status, 200, rute);
      assert.match(await res.text(), /<div id="root">/, rute);
      assert.equal(res.headers.get('cache-control'), 'no-cache', rute);
      assert.match(res.headers.get('content-type'), /text\/html/, rute);
    }
    assert.equal((await fetch(`${base}/favicon.svg`)).status, 200);
    // a missing file is a 404, never the app shell
    assert.equal((await fetch(`${base}/assets/hilang.js`)).status, 404);
    assert.equal((await fetch(`${base}/foto.png`)).status, 404);
  });
});

test('production: hashed files in /assets are cached for a year, immutable', async () => {
  await denganProduksi(async (base) => {
    const res = await fetch(`${base}/assets/index-abc123.js`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  });
});

test('production: /api keeps answering as an API; an unknown /api address is a JSON 404, not index.html', async () => {
  await denganProduksi(async (base) => {
    const sehat = await fetch(`${base}/api/health`);
    assert.deepEqual(await sehat.json(), { status: 'ok' });
    const hilang = await fetch(`${base}/api/tidak-ada`);
    assert.equal(hilang.status, 404);
    assert.match(hilang.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await hilang.json(), { error: 'Alamat API tidak ditemukan' });
    // a protected endpoint still wants a session
    assert.equal((await fetch(`${base}/api/pilihan`)).status, 401);
  });
});

test('health check answers without touching any service (so it never wakes the database)', async () => {
  const sentuh = new Proxy({}, { get: () => () => assert.fail('the health check must not call a service') });
  await denganProduksi(
    async (base) => {
      for (let i = 0; i < 3; i++) assert.equal((await fetch(`${base}/api/health`)).status, 200);
    },
    { services: { rekomendasiService: sentuh, pilihanService: sentuh, adminService: sentuh, profilService: sentuh, kompetensiService: sentuh } }
  );
});

test('production: the security headers are on every answer, and the CSP fits this client', async () => {
  await denganProduksi(async (base) => {
    for (const alamat of ['/', '/masuk', '/api/health', '/assets/index-abc123.js']) {
      const res = await fetch(base + alamat);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff', alamat);
      assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', alamat);
      assert.equal(res.headers.get('x-frame-options'), 'DENY', alamat);
      assert.equal(res.headers.get('strict-transport-security'), 'max-age=15552000', alamat);
      assert.equal(res.headers.get('content-security-policy'), CSP, alamat);
      assert.equal(res.headers.get('x-powered-by'), null, alamat);
    }
    assert.ok(!/includeSubDomains|preload/i.test(CSP));
  });
  // what the CSP must allow for this client, and must not allow
  assert.match(CSP, /frame-ancestors 'none'/);
  assert.match(CSP, /default-src 'self'/);
  assert.match(CSP, /script-src 'self'(;|$)/);
  assert.match(CSP, /style-src-elem 'self' https:\/\/fonts\.googleapis\.com/);
  assert.match(CSP, /font-src 'self' https:\/\/fonts\.gstatic\.com/);
  assert.match(CSP, /style-src-attr 'unsafe-inline'/);
  assert.ok(!/script-src[^;]*unsafe/.test(CSP), 'scripts may never be inline or eval');
  assert.ok(!/style-src-elem[^;]*unsafe/.test(CSP), 'a <style> element may not be inline');
});

test('production: /api answers are never cached by a browser or proxy', async () => {
  await denganProduksi(async (base) => {
    assert.equal((await fetch(`${base}/api/health`)).headers.get('cache-control'), 'no-store');
    assert.equal((await fetch(`${base}/api/tidak-ada`)).headers.get('cache-control'), 'no-store');
  });
});

test('not production: no extra headers, no client files, as on a laptop', async () => {
  await denganProduksi(
    async (base) => {
      const res = await fetch(`${base}/api/health`);
      assert.equal(res.headers.get('content-security-policy'), null);
      assert.equal(res.headers.get('strict-transport-security'), null);
      assert.equal(res.headers.get('cache-control'), null);
      assert.equal((await fetch(`${base}/masuk`)).status, 404);
    },
    { production: false }
  );
});

test('the Origin check still holds at one address: only the site itself may POST', async () => {
  await denganProduksi(async (base) => {
    const url = `${base}/api/auth/logout`;
    // the browser sends Origin = the site's own address on a same-origin POST
    assert.notEqual((await sendJson('POST', url, {}, { origin: ASAL, ...cookie('tok-mhs') })).status, 403);
    assert.equal((await sendJson('POST', url, {}, { origin: 'https://jahat.example.com', ...cookie('tok-mhs') })).status, 403);
    assert.equal((await sendJson('POST', url, {}, { origin: `${ASAL}.jahat.example.com`, ...cookie('tok-mhs') })).status, 403);
  });
});

// ---- errors ------------------------------------------------------------------------------------

test('a server error answers 500 with a plain message; the log has no secret from the request', async () => {
  const log = [];
  const aslinya = console.error;
  console.error = (...args) => log.push(args.join(' '));
  try {
    const rahasia = 'postgresql://pengguna:KATASANDI-RAHASIA@db.example.com/spk?sslmode=require';
    const rekomendasiService = {
      hitungRekomendasi: async () => {
        throw Object.assign(new Error(`connect gagal ke ${rahasia}\nbaris kedua dengan nilai query: tokenrahasia`), { code: 'ECONNREFUSED' });
      },
    };
    await denganProduksi(
      async (base) => {
        const res = await sendJson('POST', `${base}/api/rekomendasi?kunci=nilai-query`, { rahasiaBody: 'ISI-BODY' }, { ...cookie('tok-mhs'), origin: ASAL });
        assert.equal(res.status, 500);
        const teks = await res.text();
        assert.deepEqual(JSON.parse(teks), { error: 'Terjadi kesalahan pada server' });
        assert.ok(!/stack|at |KATASANDI|ECONN|postgres/i.test(teks), 'nothing internal in the answer');
      },
      { services: { rekomendasiService } }
    );
  } finally {
    console.error = aslinya;
  }
  const semua = log.join('\n');
  assert.match(semua, /\[galat\].*POST \/api\/rekomendasi 500 Error \(ECONNREFUSED\)/);
  for (const bocor of ['KATASANDI', 'pengguna', 'tok-mhs', 'sid=', 'ISI-BODY', 'nilai-query', 'tokenrahasia', 'baris kedua']) {
    assert.ok(!semua.includes(bocor), `the log must not contain "${bocor}"`);
  }
});

test('catatGalat: masks addresses and long tokens, keeps only code locations of the stack', () => {
  const baris = [];
  const err = new Error('gagal https://x.example.com/rahasia?a=1 dengan ' + 'a1b2c3d4'.repeat(6));
  catatGalat(err, { method: 'GET', path: '/api/x', headers: { cookie: 'sid=RAHASIA' }, body: { p: 'RAHASIA' } }, 500, (t) => baris.push(t));
  const teks = baris.join('\n');
  assert.match(teks, /GET \/api\/x 500 Error: gagal \[alamat\] dengan \[token\]/);
  assert.ok(!teks.includes('RAHASIA') && !teks.includes('rahasia?a=1') && !teks.includes('a1b2c3d4a1b2'));
  assert.match(teks, /\n {4}at /);
  assert.equal(samarkan('postgres://u:p@h/db'), '[alamat]');
});

test('a request body that is too large is a 413, not a 500', async () => {
  await denganProduksi(async (base) => {
    const besar = JSON.stringify({ x: 'a'.repeat(200 * 1024) });
    const res = await sendJson('POST', `${base}/api/auth/login`, besar, { origin: ASAL });
    assert.equal(res.status, 413);
    assert.deepEqual(await res.json(), { error: 'Permintaan terlalu besar' });
  });
});

// ---- which database a command is about ---------------------------------------------------------

test('the database line shows host and name, never the user, the password or the options', () => {
  const neon = 'postgresql://pemilik:SANDI-RAHASIA@ep-abc-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const teks = teksTarget(neon);
  assert.match(teks, /ep-abc-123\.ap-southeast-1\.aws\.neon\.tech:5432 \/ neondb \(BUKAN database di laptop ini\)/);
  for (const bocor of ['pemilik', 'SANDI', 'sslmode', 'channel_binding']) assert.ok(!teks.includes(bocor), bocor);
  assert.equal(targetDatabase('postgresql://u:p@localhost:5432/spk').lokal, true);
  assert.match(teksTarget('postgresql://u:p@localhost:5432/spk'), /database di laptop ini/);
  assert.match(teksTarget(undefined), /tidak terbaca/);
  assert.match(teksTarget('bukan url'), /tidak terbaca/);
});

// ---- seed rules --------------------------------------------------------------------------------

const KUAT = 'kata-sandi-panjang-1';

test('seed on a laptop: as before (both accounts, a short password only warns)', () => {
  const r = rencanaSeed({ SEED_PASSWORD_MAHASISWA: 'pendek', SEED_PASSWORD_ADMIN: 'pendek' });
  assert.equal(r.production, false);
  assert.equal(r.buatAkunContoh, true);
  assert.deepEqual(r.kesalahan, []);
  assert.equal(r.peringatan.length, 2);
  assert.equal(r.emailAdmin, 'contoh-admin@example.invalid');
  assert.equal(r.usernameAdmin, 'contoh-admin');
  assert.deepEqual(rencanaSeed({ SEED_PASSWORD_ADMIN: 'x'.repeat(8) }).kesalahan.length, 1); // the mahasiswa password is missing
});

test('seed in production: the administrator password needs 12 characters or more', () => {
  const prod = { NODE_ENV: 'production', SEED_ADMIN_EMAIL: 'admin@kampus.example' };
  for (const pendek of ['', 'x', 'sebelas-kar', '12345678901']) {
    assert.ok(rencanaSeed({ ...prod, SEED_PASSWORD_ADMIN: pendek }).kesalahan.length > 0, pendek);
  }
  assert.match(rencanaSeed({ ...prod, SEED_PASSWORD_ADMIN: 'sebelas-kar' }).kesalahan.join(' '), /minimal 12 karakter/);
  assert.deepEqual(rencanaSeed({ ...prod, SEED_PASSWORD_ADMIN: 'dua-belas-kr' }).kesalahan, []);
});

test('seed in production: the CONTOH mahasiswa is skipped unless SEED_AKUN_CONTOH=ya (then it needs a long password too)', () => {
  const prod = { NODE_ENV: 'production', SEED_ADMIN_EMAIL: 'admin@kampus.example', SEED_PASSWORD_ADMIN: KUAT };
  const tanpa = rencanaSeed(prod);
  assert.equal(tanpa.buatAkunContoh, false);
  assert.deepEqual(tanpa.kesalahan, []); // no mahasiswa password needed
  assert.equal(rencanaSeed({ ...prod, SEED_AKUN_CONTOH: 'tidak' }).buatAkunContoh, false);

  const ya = rencanaSeed({ ...prod, SEED_AKUN_CONTOH: 'ya' });
  assert.equal(ya.buatAkunContoh, true);
  assert.match(ya.kesalahan.join(' '), /SEED_PASSWORD_MAHASISWA belum diisi/);
  assert.match(rencanaSeed({ ...prod, SEED_AKUN_CONTOH: 'ya', SEED_PASSWORD_MAHASISWA: 'pendek' }).kesalahan.join(' '), /SEED_PASSWORD_MAHASISWA minimal 12/);
  assert.deepEqual(rencanaSeed({ ...prod, SEED_AKUN_CONTOH: 'ya', SEED_PASSWORD_MAHASISWA: KUAT }).kesalahan, []);
  assert.match(rencanaSeed({ ...prod, SEED_AKUN_CONTOH: 'mungkin' }).kesalahan.join(' '), /SEED_AKUN_CONTOH/);
});

test('seed: SEED_ADMIN_EMAIL picks the administrator email; the CONTOH one is a warning in production', () => {
  const prod = { NODE_ENV: 'production', SEED_PASSWORD_ADMIN: KUAT };
  const bawaan = rencanaSeed(prod);
  assert.equal(bawaan.emailAdmin, 'contoh-admin@example.invalid');
  assert.match(bawaan.peringatan.join(' '), /SEED_ADMIN_EMAIL/);

  const sendiri = rencanaSeed({ ...prod, SEED_ADMIN_EMAIL: '  Admin.SPK@Kampus.Example ' });
  assert.equal(sendiri.emailAdmin, 'admin.spk@kampus.example');
  assert.equal(sendiri.usernameAdmin, 'admin.spk');
  assert.deepEqual(sendiri.peringatan, []);
  assert.match(rencanaSeed({ ...prod, SEED_ADMIN_EMAIL: 'bukan-email' }).kesalahan.join(' '), /SEED_ADMIN_EMAIL/);
});
