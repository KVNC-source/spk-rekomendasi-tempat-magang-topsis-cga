import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createLoginLimiter } from '../src/lib/loginLimiter.js';
import { verifyPassword } from '../src/lib/password.js';
import { createAuthService, PESAN_PENDAFTARAN_DIBATASI } from '../src/services/auth.service.js';
import { createProfilService } from '../src/services/profil.service.js';
import { createRekomendasiService } from '../src/services/rekomendasi.service.js';
import { getAuthConfig } from '../src/config/auth.js';
import { AUTH_CONFIG, sendJson } from './helpers.js';
import { kompetensiRows, kriteriaRows, profilContoh, tempatRows } from './fixtures-db.js';

const WAKTU = new Date('2026-11-21T03:00:00.000Z');

/** An in-memory stand-in for the database, shared by the three repositories (auth, profil, rekomendasi). */
function buatDb() {
  const roles = { mahasiswa: { role_id: 1, nama_role: 'mahasiswa' }, administrator: { role_id: 2, nama_role: 'administrator' } };
  const db = { users: [], mahasiswa: [], sesi: new Map(), dibuat: [], tersimpan: null, seq: 100 };
  db.users.push({ user_id: 1, email: 'admin@example.invalid', username: 'adm', password: 'x', status: 'aktif', role: roles.administrator, mahasiswa: null });

  const tampil = (u) => ({ ...u, mahasiswa: u.mahasiswa ? { mahasiswa_id: u.mahasiswa.mahasiswa_id, nama: u.mahasiswa.nama, nim: u.mahasiswa.nim } : null });
  const unik = (kolom) => Object.assign(new Error(`Unique constraint failed on ${kolom}`), { code: 'P2002', meta: { target: [kolom] } });

  const authRepo = {
    findUserByEmail: async (email) => {
      const u = db.users.find((x) => x.email === email);
      return u ? tampil(u) : null;
    },
    findMahasiswaByNim: async (nim) => db.mahasiswa.find((m) => m.nim === nim) ?? null,
    buatAkunMahasiswa: async (a) => {
      db.dibuat.push(a);
      const role = roles[a.namaRole];
      if (!role) throw new Error('role tidak ada');
      if (db.users.some((u) => u.email === a.email)) throw unik('users_email_key');
      if (db.mahasiswa.some((m) => m.nim === a.nim)) throw unik('mahasiswa_nim_key');
      db.seq += 1;
      const mahasiswa = {
        mahasiswa_id: db.seq, user_id: db.seq, nim: a.nim, nama: a.nama, angkatan: a.angkatan, persetujuan_pada: a.persetujuanPada,
        ipk: null, minat_bidang: null, domisili_latitude: null, domisili_longitude: null, kota_domisili: null,
        jumlah_proyek: null, jumlah_sertifikasi: null, diperbarui_pada: WAKTU, kompetensi_mahasiswa: [],
      };
      const user = { user_id: db.seq, email: a.email, username: a.username, password: a.passwordHash, status: 'aktif', role, mahasiswa };
      db.mahasiswa.push(mahasiswa);
      db.users.push(user);
      return tampil(user);
    },
    buatSesi: async ({ userId, tokenHash, kedaluwarsaPada }) => db.sesi.set(tokenHash, { user_id: userId, kedaluwarsa_pada: kedaluwarsaPada }),
    findSesi: async (tokenHash) => {
      const s = db.sesi.get(tokenHash);
      return s ? { kedaluwarsa_pada: s.kedaluwarsa_pada, user: tampil(db.users.find((u) => u.user_id === s.user_id)) } : null;
    },
    hapusSesi: async (tokenHash) => db.sesi.delete(tokenHash),
    hapusSesiKedaluwarsa: async () => {},
  };

  const cariMahasiswa = async (id) => db.mahasiswa.find((m) => m.mahasiswa_id === id) ?? null;
  const profilRepo = {
    findMahasiswa: cariMahasiswa,
    findKompetensi: async () => kompetensiRows,
    simpanProfil: async (id, { kompetensi, ...kolom }) => {
      const m = await cariMahasiswa(id);
      if (!m) return null;
      Object.assign(m, kolom, {
        diperbarui_pada: new Date(WAKTU.getTime() + 1000),
        kompetensi_mahasiswa: kompetensi.map((k) => ({
          level_penguasaan: k.level_penguasaan,
          kompetensi: { kode_kompetensi: kompetensiRows.find((r) => r.kompetensi_id === k.kompetensi_id).kode_kompetensi },
        })),
      });
      return m;
    },
  };
  const rekomendasiRepo = {
    findMahasiswa: cariMahasiswa,
    findKompetensi: async () => kompetensiRows,
    findKriteria: async () => kriteriaRows(),
    findTempatDenganKebutuhan: async () => tempatRows,
    simpanHasil: async (id, items, snapshot) => {
      db.tersimpan = { mahasiswa_id: id, hasil: snapshot.hasil, sidik_profil: snapshot.sidikProfil, sidik_data: snapshot.sidikData };
      return [];
    },
    findHasilTerakhir: async () => db.tersimpan,
  };
  return { db, authRepo, profilRepo, rekomendasiRepo };
}

function buatKonteks({ maksPerJam = 5 } = {}) {
  const dunia = buatDb();
  const pendaftaranLimiter = createLoginLimiter({ maxAttempts: maksPerJam, windowMs: 3600 * 1000, now: () => WAKTU.getTime() });
  const authService = createAuthService({
    repository: dunia.authRepo,
    limiter: createLoginLimiter({ now: () => WAKTU.getTime() }),
    pendaftaranLimiter,
    config: AUTH_CONFIG,
    now: () => WAKTU,
  });
  const profilService = createProfilService({ repository: dunia.profilRepo, now: () => WAKTU });
  const rekomendasiService = createRekomendasiService({ repository: dunia.rekomendasiRepo, now: () => WAKTU });
  return { ...dunia, authService, profilService, rekomendasiService, pendaftaranLimiter };
}

async function denganApp(fn, opsi) {
  const ctx = buatKonteks(opsi);
  const server = createApp({
    rekomendasiService: ctx.rekomendasiService,
    profilService: ctx.profilService,
    authService: ctx.authService,
    pilihanService: {},
    adminService: { daftarKriteria: async () => ({ kriteria: [] }) },
    kompetensiService: {},
    authConfig: AUTH_CONFIG,
  }).listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`, ctx);
  } finally {
    server.close();
  }
}

const sah = (ubah = {}) => ({
  nama: 'Responden Uji',
  nim: '230211060099',
  angkatan: 2023,
  email: 'Responden@Example.invalid',
  password: 'kata-sandi-uji',
  konfirmasi: 'kata-sandi-uji',
  setuju: true,
  ...ubah,
});
const daftarHttp = (base, ubah, headers) => sendJson('POST', `${base}/api/auth/daftar`, sah(ubah), headers);
const bawaCookie = (res) => ({ cookie: res.headers.getSetCookie()[0].split(';')[0] });
const profilLengkap = () => ({
  ipk: 3.45,
  minat_bidang: 'Web Development',
  domisili: { kota: 'Manado' },
  jumlah_proyek: 2,
  jumlah_sertifikasi: 2,
  kompetensi: kompetensiRows.map((k) => ({ kompetensi_id: k.kode_kompetensi, level_penguasaan: profilContoh.kompetensi[k.kode_kompetensi] ?? 0 })),
});

// --- success, and straight into a session

test('POST /api/auth/daftar: 201, an httpOnly session cookie, and the new mahasiswa is signed in at once', async () => {
  await denganApp(async (base, ctx) => {
    const res = await daftarHttp(base);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.user.role, 'mahasiswa');
    assert.equal(body.user.email, 'responden@example.invalid'); // trimmed and lower-cased
    assert.equal(body.user.nama, 'Responden Uji');
    assert.equal(body.user.nim, '230211060099');
    assert.ok(body.user.mahasiswa_id);
    assert.ok(!('password' in body.user) && !('token' in body));

    const [setCookie] = res.headers.getSetCookie();
    assert.match(setCookie, /^sid=[A-Za-z0-9_-]{43};/);
    for (const bagian of ['HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=28800']) assert.ok(setCookie.includes(bagian), bagian);

    // the cookie from the registration works at once
    const saya = await fetch(`${base}/api/auth/me`, { headers: bawaCookie(res) });
    assert.equal(saya.status, 200);
    assert.deepEqual((await saya.json()).user, body.user);

    // what was stored: active mahasiswa, consent time, a scrypt hash that verifies (never the plain password)
    const [dibuat] = ctx.db.dibuat;
    assert.equal(dibuat.namaRole, 'mahasiswa');
    assert.equal(dibuat.persetujuanPada.toISOString(), WAKTU.toISOString());
    assert.equal(dibuat.angkatan, 2023);
    assert.match(dibuat.passwordHash, /^scrypt\$/);
    assert.ok(!JSON.stringify(ctx.db).includes('kata-sandi-uji'));
    assert.equal(await verifyPassword('kata-sandi-uji', dibuat.passwordHash), true);
    assert.equal(ctx.db.users.at(-1).status, 'aktif');
    assert.equal(ctx.db.users.at(-1).username, 'Responden Uji');
  });
});

test('the new account can sign in with its email and password afterwards', async () => {
  const ctx = buatKonteks();
  await ctx.authService.daftar({ body: sah(), ip: '10.0.0.1' });
  const masuk = await ctx.authService.masuk({ email: ' RESPONDEN@example.invalid ', password: 'kata-sandi-uji', ip: '10.0.0.2' });
  assert.equal(masuk.user.role, 'mahasiswa');
  await assert.rejects(() => ctx.authService.masuk({ email: 'responden@example.invalid', password: 'salah-salah', ip: '10.0.0.2' }), (e) => e.status === 401);
});

// --- validation over HTTP

test('invalid input gives 422 { error, kesalahan } with one message per field, and nothing is created', async () => {
  await denganApp(async (base, ctx) => {
    const res = await daftarHttp(base, { nama: '', nim: '123', angkatan: 2030, email: 'bukan-email', password: 'pendek', konfirmasi: 'beda', setuju: false });
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
    assert.deepEqual(Object.keys(body.kesalahan).sort(), ['angkatan', 'email', 'nama', 'nim', 'password', 'setuju']);
    assert.equal(ctx.db.dibuat.length, 0);
    assert.equal(ctx.db.sesi.size, 0);
    assert.equal(res.headers.getSetCookie().length, 0); // no cookie on a failure
  });
});

test('the consent box not ticked is refused, whatever the other fields are', async () => {
  await denganApp(async (base, ctx) => {
    for (const setuju of [false, undefined, 'true', 1, null]) {
      const res = await daftarHttp(base, { setuju });
      assert.equal(res.status, 422, JSON.stringify(setuju));
      assert.ok((await res.json()).kesalahan.setuju);
    }
    assert.equal(ctx.db.dibuat.length, 0);
  });
});

// --- duplicates

test('an email or NIM that is already registered gives 409 with a clear message per field', async () => {
  await denganApp(async (base, ctx) => {
    assert.equal((await daftarHttp(base)).status, 201);

    const emailSama = await daftarHttp(base, { nim: '999999999999', email: 'RESPONDEN@example.invalid' });
    assert.equal(emailSama.status, 409);
    const b1 = await emailSama.json();
    assert.match(b1.kesalahan.email, /sudah terdaftar/);
    assert.equal(b1.kesalahan.nim, undefined);

    const nimSama = await daftarHttp(base, { email: 'lain@example.invalid' });
    assert.equal(nimSama.status, 409);
    const b2 = await nimSama.json();
    assert.match(b2.kesalahan.nim, /sudah terdaftar/);
    assert.equal(b2.kesalahan.email, undefined);

    const keduanya = await daftarHttp(base);
    assert.equal(keduanya.status, 409);
    assert.deepEqual(Object.keys((await keduanya.json()).kesalahan).sort(), ['email', 'nim']);

    assert.equal(ctx.db.mahasiswa.filter((m) => m.nim === '230211060099').length, 1);
    assert.equal(ctx.db.sesi.size, 1); // only the first registration started a session
  });
});

test('a registration that races past the check is still stopped by the unique index (P2002 becomes 409)', async () => {
  const ctx = buatKonteks();
  // the check sees nobody, but by the time of the insert somebody else has taken the NIM
  ctx.authRepo.findMahasiswaByNim = async () => null;
  ctx.authRepo.findUserByEmail = async () => null;
  ctx.authRepo.buatAkunMahasiswa = async () => {
    throw Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['mahasiswa_nim_key'] } });
  };
  await assert.rejects(
    () => ctx.authService.daftar({ body: sah(), ip: '10.0.0.1' }),
    (e) => e.status === 409 && Boolean(e.details.kesalahan.nim) && !e.details.kesalahan.email
  );
  ctx.authRepo.buatAkunMahasiswa = async () => {
    throw Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['users_email_key'] } });
  };
  await assert.rejects(() => ctx.authService.daftar({ body: sah(), ip: '10.0.0.1' }), (e) => e.status === 409 && Boolean(e.details.kesalahan.email));
  // any other database error is not turned into a 409
  ctx.authRepo.buatAkunMahasiswa = async () => {
    throw new Error('koneksi putus');
  };
  await assert.rejects(() => ctx.authService.daftar({ body: sah(), ip: '10.0.0.1' }), (e) => e.status === undefined);
});

// --- nobody can register as administrator

test('registering as an administrator is not possible, whatever the body says', async () => {
  await denganApp(async (base, ctx) => {
    const res = await sendJson('POST', `${base}/api/auth/daftar`, {
      ...sah(), role: 'administrator', peran: 'administrator', role_id: 2, status: 'nonaktif', user_id: 1, mahasiswa_id: 1, is_admin: true,
    });
    assert.equal(res.status, 201);
    const { user } = await res.json();
    assert.equal(user.role, 'mahasiswa');

    const [dibuat] = ctx.db.dibuat;
    assert.equal(dibuat.namaRole, 'mahasiswa');
    assert.deepEqual(Object.keys(dibuat).sort(), ['angkatan', 'email', 'namaRole', 'nama', 'nim', 'passwordHash', 'persetujuanPada', 'username'].sort());
    assert.equal(ctx.db.users.at(-1).status, 'aktif');
    assert.equal(ctx.db.users.at(-1).role.nama_role, 'mahasiswa');

    // and the new session is a mahasiswa session: the administrator API answers 403
    const admin = await fetch(`${base}/api/admin/kriteria`, { headers: bawaCookie(res) });
    assert.equal(admin.status, 403);
  });
});

test('an email that already belongs to the administrator cannot be registered', async () => {
  const ctx = buatKonteks();
  await assert.rejects(() => ctx.authService.daftar({ body: sah({ email: 'admin@example.invalid' }), ip: '10.0.0.1' }), (e) => e.status === 409);
});

// --- per-IP limit

test('only successful registrations count: the 6th from one IP in an hour is 429, another IP is not affected', async () => {
  const ctx = buatKonteks({ maksPerJam: 5 });
  const nomor = (i) => ({ nim: `2302110600${10 + i}`, email: `uji${i}@example.invalid` });
  for (let i = 0; i < 5; i += 1) await ctx.authService.daftar({ body: sah(nomor(i)), ip: '10.0.0.1' });
  await assert.rejects(
    () => ctx.authService.daftar({ body: sah(nomor(5)), ip: '10.0.0.1' }),
    (e) => e.status === 429 && e.message === PESAN_PENDAFTARAN_DIBATASI
  );
  assert.equal(ctx.db.dibuat.length, 5);
  await ctx.authService.daftar({ body: sah(nomor(6)), ip: '10.0.0.2' }); // another network
  assert.equal(ctx.db.dibuat.length, 6);
});

test('validation failures and duplicates do not use up the limit', async () => {
  const ctx = buatKonteks({ maksPerJam: 2 });
  for (let i = 0; i < 6; i += 1) await assert.rejects(() => ctx.authService.daftar({ body: sah({ nim: '1' }), ip: '10.0.0.1' }), (e) => e.status === 422);
  await ctx.authService.daftar({ body: sah(), ip: '10.0.0.1' });
  for (let i = 0; i < 4; i += 1) await assert.rejects(() => ctx.authService.daftar({ body: sah(), ip: '10.0.0.1' }), (e) => e.status === 409);
  await ctx.authService.daftar({ body: sah({ nim: '230211060098', email: 'dua@example.invalid' }), ip: '10.0.0.1' }); // the 2nd success
  await assert.rejects(() => ctx.authService.daftar({ body: sah({ nim: '230211060097', email: 'tiga@example.invalid' }), ip: '10.0.0.1' }), (e) => e.status === 429);
});

test('over HTTP the limit answers 429 with its message', async () => {
  await denganApp(async (base) => {
    assert.equal((await daftarHttp(base, { nim: '230211060001', email: 'satu@example.invalid' })).status, 201);
    assert.equal((await daftarHttp(base, { nim: '230211060002', email: 'dua@example.invalid' })).status, 201);
    const res = await daftarHttp(base, { nim: '230211060003', email: 'tiga@example.invalid' });
    assert.equal(res.status, 429);
    assert.equal((await res.json()).error, PESAN_PENDAFTARAN_DIBATASI);
  }, { maksPerJam: 2 });
});

test('the limit comes from DAFTAR_MAKS_PER_JAM (5 by default); a bad value stops the server from starting', () => {
  const dasar = { CLIENT_ORIGIN: 'http://localhost:5173' };
  assert.equal(getAuthConfig(dasar).daftarMaksPerJam, 5);
  assert.equal(getAuthConfig({ ...dasar, DAFTAR_MAKS_PER_JAM: '' }).daftarMaksPerJam, 5);
  assert.equal(getAuthConfig({ ...dasar, DAFTAR_MAKS_PER_JAM: '30' }).daftarMaksPerJam, 30);
  for (const buruk of ['0', '-1', '2.5', 'banyak']) {
    assert.throws(() => getAuthConfig({ ...dasar, DAFTAR_MAKS_PER_JAM: buruk }), /DAFTAR_MAKS_PER_JAM/, buruk);
  }
});

// --- Origin and CORS

test('the Origin check covers this endpoint: a foreign Origin is refused, the client origin and no Origin pass', async () => {
  await denganApp(async (base, ctx) => {
    const asing = await daftarHttp(base, {}, { origin: 'http://jahat.example' });
    assert.equal(asing.status, 403);
    assert.equal(ctx.db.dibuat.length, 0);

    const klien = await daftarHttp(base, { nim: '230211060011', email: 'a@example.invalid' }, { origin: AUTH_CONFIG.clientOrigin });
    assert.equal(klien.status, 201);
    assert.equal(klien.headers.get('access-control-allow-origin'), AUTH_CONFIG.clientOrigin);
    assert.equal(klien.headers.get('access-control-allow-credentials'), 'true');

    assert.equal((await daftarHttp(base, { nim: '230211060012', email: 'b@example.invalid' })).status, 201); // curl/Postman: no Origin
  });
});

test('malformed JSON is a 400 and an empty body a 422; neither creates anything', async () => {
  await denganApp(async (base, ctx) => {
    const rusak = await sendJson('POST', `${base}/api/auth/daftar`, '{"nama": ', {});
    assert.equal(rusak.status, 400);
    const kosong = await sendJson('POST', `${base}/api/auth/daftar`, {}, {});
    assert.equal(kosong.status, 422);
    assert.equal(ctx.db.dibuat.length, 0);
  });
});

// --- the new account can use the whole flow

test('a new account can fill its profile and get recommendations straight away', async () => {
  await denganApp(async (base) => {
    const res = await daftarHttp(base);
    const cookie = bawaCookie(res);

    // a brand-new profile is a Draf
    const awal = await (await fetch(`${base}/api/mahasiswa/me/profil`, { headers: cookie })).json();
    assert.equal(awal.status, 'Draf');
    assert.deepEqual(awal.mahasiswa.nama, 'Responden Uji');
    assert.equal(awal.mahasiswa.nim, '230211060099');
    assert.equal(awal.mahasiswa.angkatan, 2023);

    // calculating now is refused: the data fields are empty
    const terlalu = await sendJson('POST', `${base}/api/rekomendasi`, {}, cookie);
    assert.equal(terlalu.status, 422);

    // fill the profile
    const simpan = await sendJson('PUT', `${base}/api/mahasiswa/me/profil`, profilLengkap(), cookie);
    assert.equal(simpan.status, 200);
    assert.equal((await simpan.json()).status, 'Lengkap');

    // calculate and read the last result
    const hitung = await sendJson('POST', `${base}/api/rekomendasi`, {}, cookie);
    assert.equal(hitung.status, 200);
    const hasil = await hitung.json();
    assert.equal(hasil.ranking.length, 15);
    assert.deepEqual(hasil.ranking.slice(0, 3).map((r) => r.id), ['T05', 'T01', 'T04']);
    assert.equal(hasil.basi, false);

    const terakhir = await fetch(`${base}/api/rekomendasi/terakhir`, { headers: cookie });
    assert.equal(terakhir.status, 200);
    assert.deepEqual(await terakhir.json(), hasil);
  });
});

test('two new accounts only ever see their own profile', async () => {
  await denganApp(async (base) => {
    const satu = await daftarHttp(base, { nim: '230211060021', email: 'satu@example.invalid', nama: 'Satu' });
    const dua = await daftarHttp(base, { nim: '230211060022', email: 'dua@example.invalid', nama: 'Dua' });
    await sendJson('PUT', `${base}/api/mahasiswa/me/profil`, { ...profilLengkap(), ipk: 3.9 }, bawaCookie(satu));
    const profilDua = await (await fetch(`${base}/api/mahasiswa/me/profil`, { headers: bawaCookie(dua) })).json();
    assert.equal(profilDua.mahasiswa.nama, 'Dua');
    assert.equal(profilDua.ipk, null);
  });
});
