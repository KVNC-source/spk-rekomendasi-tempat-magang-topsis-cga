import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIDANG } from '../src/engine/src/config.js';
import { DAFTAR_KOTA } from '../src/lib/kotaDomisili.js';
import { createProfilService, hitungStatus } from '../src/services/profil.service.js';
import { ADMIN, MAHASISWA, cookie, sendJson, withApp } from './helpers.js';
import { kompetensiRows, mahasiswa } from './fixtures-db.js';

const jawabanLengkap = () => kompetensiRows.map((k) => ({ kompetensi_id: k.kode_kompetensi, level_penguasaan: 2 }));
const isianLengkap = () => ({
  ipk: 3.5,
  minat_bidang: 'Data Science',
  domisili: { kota: 'Manado' },
  jumlah_proyek: 1,
  jumlah_sertifikasi: 0,
  kompetensi: jawabanLengkap(),
});

/** A mahasiswa row with the answers for the given kompetensi codes only. */
const barisDengan = (ubah = {}, kodeDijawab = kompetensiRows.map((k) => k.kode_kompetensi)) => ({
  ...mahasiswa,
  ...ubah,
  kompetensi_mahasiswa: kodeDijawab.map((kode) => ({ level_penguasaan: 0, kompetensi: { kode_kompetensi: kode } })),
});

// --- status: Draf / Lengkap, decided by the server

test('hitungStatus: Lengkap only when every data field is filled and every kompetensi is answered', () => {
  assert.equal(hitungStatus(barisDengan(), kompetensiRows), 'Lengkap');
  // a level 0 ("Belum punya") counts as answered: barisDengan() stores 0 for all of them
});

test('hitungStatus: each missing data field makes it Draf', () => {
  for (const kosong of [
    { ipk: null },
    { minat_bidang: null },
    { kota_domisili: null },
    { domisili_latitude: null },
    { domisili_longitude: null },
    { jumlah_proyek: null },
    { jumlah_sertifikasi: null },
  ]) {
    assert.equal(hitungStatus(barisDengan(kosong), kompetensiRows), 'Draf', JSON.stringify(kosong));
  }
  assert.equal(hitungStatus(barisDengan({ jumlah_proyek: 0, jumlah_sertifikasi: 0 }), kompetensiRows), 'Lengkap'); // 0 is an answer
});

test('hitungStatus: one unanswered kompetensi makes it Draf, also one the Administrator added later', () => {
  const tanpaK05 = kompetensiRows.map((k) => k.kode_kompetensi).filter((kode) => kode !== 'K05');
  assert.equal(hitungStatus(barisDengan({}, tanpaK05), kompetensiRows), 'Draf');

  const baru = { kompetensi_id: 99, kode_kompetensi: 'K99', nama_kompetensi: 'Baru', skala_maksimum: 4 };
  assert.equal(hitungStatus(barisDengan(), [...kompetensiRows, baru]), 'Draf');
});

// --- the service, on an in-memory repository

function fakeRepository() {
  const state = { mahasiswa: { ...mahasiswa, kompetensi_mahasiswa: [...mahasiswa.kompetensi_mahasiswa] }, simpan: [] };
  return {
    state,
    findMahasiswa: async (id) => (id === state.mahasiswa.mahasiswa_id ? state.mahasiswa : null),
    findKompetensi: async () => kompetensiRows,
    simpanProfil: async (id, { kompetensi, ...kolom }) => {
      state.simpan.push({ id, kolom, kompetensi });
      if (id !== state.mahasiswa.mahasiswa_id) return null;
      state.mahasiswa = {
        ...state.mahasiswa,
        ...kolom,
        diperbarui_pada: new Date('2026-11-20T01:00:00.000Z'),
        kompetensi_mahasiswa: kompetensi.map((k) => ({
          level_penguasaan: k.level_penguasaan,
          kompetensi: { kode_kompetensi: kompetensiRows.find((r) => r.kompetensi_id === k.kompetensi_id).kode_kompetensi },
        })),
      };
      return state.mahasiswa;
    },
  };
}

test('GET profile: the response has the shape of the client contract, with the status computed by the server', async () => {
  const service = createProfilService({ repository: fakeRepository() });
  const profil = await service.baca(1);
  assert.deepEqual(Object.keys(profil).sort(), [
    'diperbarui_pada', 'domisili', 'ipk', 'jumlah_proyek', 'jumlah_sertifikasi', 'kompetensi', 'mahasiswa', 'minat_bidang', 'status',
  ]);
  assert.equal(profil.status, 'Lengkap');
  assert.equal(profil.ipk, 3.45);
  assert.deepEqual(profil.domisili, { kota: 'Manado', lat: 1.4748, lon: 124.8421 });
  assert.equal(profil.jumlah_proyek, 2);
  assert.equal(profil.kompetensi.length, 21);
  assert.deepEqual(profil.kompetensi[0], { kompetensi_id: 'K01', level_penguasaan: 3 });
  assert.equal(profil.diperbarui_pada, '2026-11-16T09:30:00.000Z');
  assert.deepEqual(Object.keys(profil.mahasiswa).sort(), ['angkatan', 'mahasiswa_id', 'nama', 'nim']);
});

test('GET profile: 404 when the mahasiswa does not exist', async () => {
  const service = createProfilService({ repository: fakeRepository() });
  await assert.rejects(() => service.baca(99), (e) => e.status === 404);
});

test('PUT profile: a partial draft is saved and reported as Draf', async () => {
  const repository = fakeRepository();
  const service = createProfilService({ repository });
  const profil = await service.simpan(1, {
    ipk: 3.2,
    minat_bidang: null,
    domisili: { kota: 'Bitung' },
    jumlah_proyek: null,
    jumlah_sertifikasi: null,
    kompetensi: [{ kompetensi_id: 'K01', level_penguasaan: 4 }],
  });
  assert.equal(profil.status, 'Draf');
  assert.equal(profil.ipk, 3.2);
  assert.equal(profil.minat_bidang, null);
  assert.equal(profil.domisili.kota, 'Bitung');
  assert.deepEqual(profil.kompetensi, [{ kompetensi_id: 'K01', level_penguasaan: 4 }]);
});

test('PUT profile: a complete body is saved and reported as Lengkap; the coordinates come from the kota list', async () => {
  const repository = fakeRepository();
  const service = createProfilService({ repository });
  const profil = await service.simpan(1, { ...isianLengkap(), domisili: { kota: 'Manado', lat: 99, lon: 99 } });
  assert.equal(profil.status, 'Lengkap');
  const manado = DAFTAR_KOTA.find((k) => k.kota === 'Manado');
  assert.deepEqual(profil.domisili, { kota: 'Manado', lat: manado.lat, lon: manado.lon });
  assert.equal(repository.state.simpan[0].kolom.domisili_latitude, manado.lat); // stored from the list, not from the body
  assert.equal(profil.kompetensi.length, 21);
});

test('PUT profile: it replaces the whole set; an answer that is not sent is no longer answered', async () => {
  const repository = fakeRepository();
  const service = createProfilService({ repository });
  assert.equal((await service.baca(1)).kompetensi.length, 21);
  const profil = await service.simpan(1, { ...isianLengkap(), kompetensi: jawabanLengkap().slice(0, 20) });
  assert.equal(profil.kompetensi.length, 20);
  assert.equal(profil.status, 'Draf'); // one kompetensi is unanswered again
});

test('PUT profile: invalid values give 422 with a message per field, and nothing is saved', async () => {
  const repository = fakeRepository();
  const service = createProfilService({ repository });
  await assert.rejects(
    () => service.simpan(1, { ...isianLengkap(), ipk: 4.5, domisili: { kota: 'Atlantis' }, minat_bidang: 'QA' }),
    (e) => e.status === 422 && ['ipk', 'domisili', 'minat_bidang'].every((f) => typeof e.details.kesalahan[f] === 'string')
  );
  assert.equal(repository.state.simpan.length, 0);
});

test('PUT profile: 404 when the mahasiswa does not exist', async () => {
  const service = createProfilService({ repository: fakeRepository() });
  await assert.rejects(() => service.simpan(99, isianLengkap()), (e) => e.status === 404);
});

// --- HTTP: roles, and a mahasiswa only ever reaches their own profile

function fakeProfilService() {
  const calls = [];
  return {
    calls,
    baca: async (id) => {
      calls.push(['baca', id]);
      return { status: 'Draf', mahasiswa: { mahasiswa_id: id } };
    },
    simpan: async (id, body) => {
      calls.push(['simpan', id, body]);
      return { status: 'Draf', mahasiswa: { mahasiswa_id: id } };
    },
  };
}

test('profile endpoints: 401 without a session, 403 for the administrator; the service is not called', async () => {
  const profilService = fakeProfilService();
  await withApp({ profilService }, async (base) => {
    const url = `${base}/api/mahasiswa/me/profil`;
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await sendJson('PUT', url, {})).status, 401);
    assert.equal((await fetch(url, { headers: cookie('tok-admin') })).status, 403);
    assert.equal((await sendJson('PUT', url, {}, cookie('tok-admin'))).status, 403);
  });
  assert.equal(profilService.calls.length, 0);
});

test('profile endpoints: the mahasiswa is the signed-in one, whatever the body or query says', async () => {
  const profilService = fakeProfilService();
  await withApp({ profilService }, async (base) => {
    const url = `${base}/api/mahasiswa/me/profil`;
    const baca = await fetch(`${url}?mahasiswa_id=999`, { headers: cookie('tok-mhs') });
    assert.equal(baca.status, 200);
    assert.equal((await baca.json()).mahasiswa.mahasiswa_id, MAHASISWA.mahasiswa_id);

    const simpan = await sendJson('PUT', url, { mahasiswa_id: 999, ipk: 3 }, cookie('tok-mhs'));
    assert.equal(simpan.status, 200);
  });
  assert.deepEqual(profilService.calls[0], ['baca', MAHASISWA.mahasiswa_id]);
  assert.equal(profilService.calls[1][1], MAHASISWA.mahasiswa_id);
});

test('profile endpoints: a validation error reaches the client as 422 { error, kesalahan }', async () => {
  const service = createProfilService({ repository: fakeRepository() });
  await withApp({ profilService: service }, async (base) => {
    const res = await sendJson('PUT', `${base}/api/mahasiswa/me/profil`, { ...isianLengkap(), ipk: 9 }, cookie('tok-mhs'));
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
    assert.equal(typeof body.kesalahan.ipk, 'string');
  });
});

// --- reference lists

test('GET /api/bidang-minat: the 7 engine values; GET /api/kota-domisili: the 27 kota with coordinates; sign-in required', async () => {
  await withApp({}, async (base) => {
    assert.equal((await fetch(`${base}/api/bidang-minat`)).status, 401);
    assert.equal((await fetch(`${base}/api/kota-domisili`)).status, 401);

    for (const token of ['tok-mhs', 'tok-admin']) {
      const bidang = await (await fetch(`${base}/api/bidang-minat`, { headers: cookie(token) })).json();
      assert.deepEqual(bidang, BIDANG);
      assert.equal(bidang.length, 7);

      const kota = await (await fetch(`${base}/api/kota-domisili`, { headers: cookie(token) })).json();
      assert.equal(kota.length, 27);
      for (const k of kota) {
        assert.equal(typeof k.kota, 'string');
        assert.equal(typeof k.lat, 'number');
        assert.equal(typeof k.lon, 'number');
      }
      assert.ok(kota.some((k) => k.kota === 'Manado'));
    }
    // the guard is per route: an unknown path under /api is still a plain 404, not a 401
    assert.equal((await fetch(`${base}/api/tidak-ada`)).status, 404);
  });
});

test('the administrator is not a mahasiswa: both profile methods answer 403 before any lookup', async () => {
  await withApp({ profilService: createProfilService({ repository: fakeRepository() }) }, async (base) => {
    assert.equal((await fetch(`${base}/api/mahasiswa/me/profil`, { headers: cookie('tok-admin') })).status, 403);
    assert.equal(ADMIN.mahasiswa_id, null);
  });
});
