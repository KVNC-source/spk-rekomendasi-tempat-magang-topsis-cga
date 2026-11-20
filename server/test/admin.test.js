import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIDANG } from '../src/engine/src/config.js';
import { createAdminService } from '../src/services/admin.service.js';
import { createKompetensiService } from '../src/services/kompetensi.service.js';
import { createRekomendasiService } from '../src/services/rekomendasi.service.js';
import { NOW, kompetensiRows, kriteriaRows, mahasiswa, tempatRows } from './fixtures-db.js';
import { cookie, sendJson, withApp } from './helpers.js';

const KATEGORI = 'Web';
const SEKARANG = new Date('2026-11-19T00:00:00.000Z');

/** In-memory stand-in for the admin repository, with the same shapes Prisma returns. */
function fakeAdminRepository() {
  const state = {
    kriteria: kriteriaRows(),
    kompetensi: kompetensiRows.map((k) => ({
      ...k,
      kategori: KATEGORI,
      deskripsi: null,
      _count: { kebutuhan_kompetensi: 0, kompetensi_mahasiswa: 0, hasil_cga_detail: 0 },
    })),
    tempat: tempatRows.map((t) => ({ ...t, _count: { hasil_cga: 0, pilihan: 0 } })),
    nextId: 1000,
    calls: [],
  };
  const idKompetensi = (kode) => state.kompetensi.find((k) => k.kode_kompetensi === kode);
  const kebutuhanRows = (rows) =>
    rows.map((r) => {
      const k = state.kompetensi.find((x) => x.kompetensi_id === r.kompetensiId);
      return {
        kebutuhan_id: state.nextId++,
        level_minimum: r.level_minimum,
        is_mandatory: r.wajib,
        kompetensi: { kode_kompetensi: k.kode_kompetensi, nama_kompetensi: k.nama_kompetensi },
      };
    });
  const kolom = (d) => ({
    ...d,
    tanggal_akses: d.tanggal_akses ? new Date(`${d.tanggal_akses}T00:00:00Z`) : null,
  });

  return {
    state,
    findKriteria: async () => state.kriteria.map((r) => ({ ...r })),
    updateBobot: async (peta) => {
      state.calls.push(['updateBobot', peta]);
      for (const row of state.kriteria) if (row.kode_kriteria in peta) row.bobot = String(peta[row.kode_kriteria]);
    },
    findKompetensi: async () => state.kompetensi.map((k) => ({ ...k })),
    findKompetensiByKode: async (kode) => idKompetensi(kode) ?? null,
    createKompetensi: async (d) => {
      state.calls.push(['createKompetensi', d]);
      const row = { ...d, kompetensi_id: state.nextId++, _count: { kebutuhan_kompetensi: 0, kompetensi_mahasiswa: 0, hasil_cga_detail: 0 } };
      state.kompetensi.push(row);
      return row;
    },
    updateKompetensi: async (id, d) => {
      state.calls.push(['updateKompetensi', d]);
      const row = state.kompetensi.find((k) => k.kompetensi_id === id);
      Object.assign(row, { nama_kompetensi: d.nama_kompetensi, kategori: d.kategori, deskripsi: d.deskripsi });
      return row;
    },
    deleteKompetensi: async (id) => {
      state.calls.push(['deleteKompetensi', id]);
      state.kompetensi = state.kompetensi.filter((k) => k.kompetensi_id !== id);
    },
    findTempatList: async () => state.tempat,
    findTempatByKode: async (kode) => state.tempat.find((t) => t.kode_tempat === kode) ?? null,
    createTempat: async (d, rows) => {
      state.calls.push(['createTempat', d, rows]);
      const row = { ...kolom(d), tempat_id: state.nextId++, kebutuhan_kompetensi: kebutuhanRows(rows), _count: { hasil_cga: 0, pilihan: 0 } };
      state.tempat.push(row);
      return row;
    },
    updateTempat: async (id, d, rows) => {
      state.calls.push(['updateTempat', d, rows]);
      const row = state.tempat.find((t) => t.tempat_id === id);
      const { kode_tempat: _kode, ...tanpaKode } = d; // like the real repository: the code is never rewritten
      Object.assign(row, kolom(tanpaKode), { kebutuhan_kompetensi: kebutuhanRows(rows) });
      return row;
    },
    deleteTempat: async (id) => {
      state.calls.push(['deleteTempat', id]);
      state.tempat = state.tempat.filter((t) => t.tempat_id !== id);
    },
  };
}

const buat = () => {
  const repository = fakeAdminRepository();
  return { repository, service: createAdminService({ repository, now: () => SEKARANG }) };
};

const tempatBaru = (ubah = {}) => ({
  nama_perusahaan: 'PT Baru Sejahtera',
  posisi: 'Backend Intern',
  bidang_industri: 'Web Development',
  lokasi: 'Manado',
  latitude: 1.4748,
  longitude: 124.8421,
  mode_kerja: 'On-site',
  benefit_finansial: null,
  reputasi: null,
  status_alternatif: 'Dipakai',
  sumber_url: null,
  tanggal_akses: null,
  kebutuhan: [{ kompetensi: 'K01', level_minimum: 2, wajib: true }],
  ...ubah,
});

const galat422 = (field) => (e) => e.status === 422 && Boolean(e.details?.kesalahan?.[field]);

// -------------------------------------------------------------------- kriteria

test('kriteria: GET returns the weights, the total and the "sementara" label', async () => {
  const { service } = buat();
  const hasil = await service.daftarKriteria();
  assert.equal(hasil.kriteria.length, 7);
  assert.equal(hasil.total, 1);
  assert.equal(hasil.sementara, true);
  assert.match(hasil.catatan, /sementara, menunggu validasi pakar/);
});

test('kriteria: a total other than 1.00 is refused and nothing is saved', async () => {
  const { service, repository } = buat();
  const salah = { bobot: { C1: 0.3, C2: 0.2, C3: 0.15, C4: 0.1, C5: 0.1, C6: 0.1, C7: 0.04 } };
  await assert.rejects(() => service.ubahBobot(salah), galat422('total'));
  assert.equal(repository.state.calls.filter(([n]) => n === 'updateBobot').length, 0);
  assert.equal(Number(repository.state.kriteria[6].bobot), 0.05); // unchanged
});

test('kriteria: valid weights are saved, a zero weight is warned about', async () => {
  const { service, repository } = buat();
  const hasil = await service.ubahBobot({ bobot: { C1: 0.4, C2: 0.3, C3: 0.15, C4: 0, C5: 0.1, C6: 0.05, C7: 0 } });
  assert.equal(hasil.total, 1);
  assert.equal(hasil.kriteria.find((k) => k.kode_kriteria === 'C1').bobot, 0.4);
  assert.equal(hasil.peringatan.length, 2);
  assert.equal(repository.state.calls.filter(([n]) => n === 'updateBobot').length, 1);
});

test('kriteria: the weights the Administrator saves are the ones the NEXT recommendation uses', async () => {
  const admin = buat();
  const kriteriaDiTabel = () => admin.repository.findKriteria();
  const rekomendasi = createRekomendasiService({
    repository: {
      findMahasiswa: async () => mahasiswa,
      findKompetensi: async () => kompetensiRows,
      findKriteria: kriteriaDiTabel, // the same kriteria_topsis table
      findTempatDenganKebutuhan: async () => tempatRows,
      simpanHasil: async (_id, items) => items.map((it, i) => ({ tempatId: it.tempatId, cgaId: i, topsisId: i })),
    },
    now: () => NOW,
  });

  const sebelum = await rekomendasi.hitungRekomendasi(1);
  // put (almost) all the weight on C4, the distance: a very different ranking
  await admin.service.ubahBobot({ bobot: { C1: 0.05, C2: 0.05, C3: 0.05, C4: 0.7, C5: 0.05, C6: 0.05, C7: 0.05 } });
  const sesudah = await rekomendasi.hitungRekomendasi(1);

  const urutan = (h) => h.ranking.map((r) => r.id).join(',');
  assert.notEqual(urutan(sebelum), urutan(sesudah), 'the ranking should change with the weights');
  assert.notEqual(sebelum.ranking[0].ci, sesudah.ranking[0].ci);
  // the TOPSIS steps carry the weights that were used
  assert.equal(sesudah.steps.criteria.find((c) => c.code === 'C4').weight, 0.7);
  assert.equal(sebelum.steps.criteria.find((c) => c.code === 'C4').weight, 0.1);
});

// ---------------------------------------------------------------- tempat magang

test('tempat: a valid new tempat gets the next code and its kebutuhan, stored together', async () => {
  const { service, repository } = buat();
  const hasil = await service.buatTempat(tempatBaru());
  assert.equal(hasil.kode_tempat, 'T18');
  assert.equal(hasil.status_alternatif, 'Dipakai');
  assert.deepEqual(hasil.kebutuhan.map((k) => [k.kompetensi, k.level_minimum, k.wajib]), [['K01', 2, true]]);
  assert.equal(hasil.jumlah_wajib, 1);
  assert.equal(hasil.bisa_dihapus, true);
  const [panggilan] = repository.state.calls.filter(([n]) => n === 'createTempat');
  assert.equal(panggilan[2][0].kompetensiId, kompetensiRows.find((k) => k.kode_kompetensi === 'K01').kompetensi_id);
});

test('tempat: Dipakai without a wajib kompetensi is refused, and nothing is created', async () => {
  const { service, repository } = buat();
  for (const kebutuhan of [[], [{ kompetensi: 'K02', level_minimum: 1, wajib: false }]]) {
    await assert.rejects(() => service.buatTempat(tempatBaru({ kebutuhan })), galat422('kebutuhan'));
  }
  assert.equal(repository.state.calls.filter(([n]) => n === 'createTempat').length, 0);
});

test('tempat: level outside 1-4, unknown bidang and coordinates outside Indonesia are refused with field messages', async () => {
  const { service } = buat();
  await assert.rejects(() => service.buatTempat(tempatBaru({ kebutuhan: [{ kompetensi: 'K01', level_minimum: 5, wajib: true }] })), galat422('kebutuhan[0].level_minimum'));
  await assert.rejects(() => service.buatTempat(tempatBaru({ bidang_industri: 'QA' })), galat422('bidang_industri'));
  await assert.rejects(
    () => service.buatTempat(tempatBaru({ latitude: 51.5074, longitude: -0.1278 })),
    (e) => e.status === 422 && /Indonesia/.test(e.details.kesalahan.latitude)
  );
  assert.ok(BIDANG.includes('Web Development'));
});

test('tempat: a duplicate code is 409; an unknown tempat is 404', async () => {
  const { service } = buat();
  await assert.rejects(() => service.buatTempat(tempatBaru({ kode_tempat: 'T05' })), (e) => e.status === 409);
  await assert.rejects(() => service.ambilTempat('T99'), (e) => e.status === 404);
  await assert.rejects(() => service.ubahTempat('T99', tempatBaru()), (e) => e.status === 404);
  await assert.rejects(() => service.hapusTempat('T99'), (e) => e.status === 404);
});

test('tempat: an update replaces the fields and the whole kebutuhan list; the code cannot change', async () => {
  const { service } = buat();
  const hasil = await service.ubahTempat('T05', tempatBaru({ nama_perusahaan: 'PT Qtera (ubah)', kebutuhan: [
    { kompetensi: 'K03', level_minimum: 3, wajib: true },
    { kompetensi: 'K04', level_minimum: 1, wajib: false },
  ] }));
  assert.equal(hasil.kode_tempat, 'T05');
  assert.equal(hasil.nama_perusahaan, 'PT Qtera (ubah)');
  assert.deepEqual(hasil.kebutuhan.map((k) => k.kompetensi), ['K03', 'K04']);
  assert.equal(hasil.jumlah_wajib, 1);
  assert.equal(hasil.jumlah_opsional, 1);

  await assert.rejects(() => service.ubahTempat('T05', tempatBaru({ kode_tempat: 'T55' })), galat422('kode_tempat'));
  // taking the last wajib kompetensi away from a Dipakai tempat is refused
  await assert.rejects(() => service.ubahTempat('T05', tempatBaru({ kebutuhan: [{ kompetensi: 'K02', level_minimum: 1, wajib: false }] })), galat422('kebutuhan'));
});

test('tempat: one that appears in results or choices cannot be deleted (409); a free one can', async () => {
  const { service, repository } = buat();
  repository.state.tempat.find((t) => t.kode_tempat === 'T05')._count.hasil_cga = 2;
  await assert.rejects(
    () => service.hapusTempat('T05'),
    (e) => e.status === 409 && /Dikeluarkan/.test(e.message)
  );
  const baru = await service.buatTempat(tempatBaru());
  await service.hapusTempat(baru.kode_tempat);
  await assert.rejects(() => service.ambilTempat(baru.kode_tempat), (e) => e.status === 404);
});

test('tempat: the list is ordered by code and carries the counts the page needs', async () => {
  const { service } = buat();
  const daftar = await service.daftarTempat();
  assert.equal(daftar.length, 17);
  assert.equal(daftar[0].kode_tempat, 'T01');
  assert.equal(daftar[16].kode_tempat, 'T17');
  assert.ok(daftar.every((t) => typeof t.jumlah_wajib === 'number' && typeof t.bisa_dihapus === 'boolean'));
});

// -------------------------------------------------------------------- kompetensi

test('kompetensi: create gets the next code and a fixed 0-4 scale; the new one is in the form list at once', async () => {
  const { service, repository } = buat();
  const hasil = await service.buatKompetensi({ nama_kompetensi: 'Docker dan Kontainer', kategori: 'Tools', skala_maksimum: 9 });
  assert.equal(hasil.kode_kompetensi, 'K22');
  assert.equal(hasil.skala_maksimum, 4);

  // GET /api/kompetensi (what the mahasiswa's profile form reads) shows it straight away
  const daftar = await createKompetensiService({ repository }).daftar();
  assert.equal(daftar.length, 22);
  assert.deepEqual(daftar.at(-1), {
    kompetensi_id: 'K22',
    nama_kompetensi: 'Docker dan Kontainer',
    kategori: 'Tools',
    deskripsi: null,
    skala_maksimum: 4,
  });
});

test('kompetensi: a duplicate name is refused; update changes name, kategori and deskripsi but not the scale', async () => {
  const { service } = buat();
  await assert.rejects(() => service.buatKompetensi({ nama_kompetensi: 'dasar pemrograman', kategori: 'X' }), galat422('nama_kompetensi'));
  const hasil = await service.ubahKompetensi('K01', { nama_kompetensi: 'Dasar Pemrograman (ubah)', kategori: 'Pemrograman', deskripsi: 'Baru', skala_maksimum: 9 });
  assert.equal(hasil.nama_kompetensi, 'Dasar Pemrograman (ubah)');
  assert.equal(hasil.deskripsi, 'Baru');
  assert.equal(hasil.skala_maksimum, 4);
  await assert.rejects(() => service.ubahKompetensi('K01', { nama_kompetensi: 'Dasar Pemrograman', kategori: 'X', kode_kompetensi: 'K50' }), galat422('kode_kompetensi'));
  await assert.rejects(() => service.ubahKompetensi('K99', { nama_kompetensi: 'Z', kategori: 'X' }), (e) => e.status === 404);
});

test('kompetensi: delete is refused while it is used (409), and allowed when it is not', async () => {
  const { service, repository } = buat();
  repository.state.kompetensi.find((k) => k.kode_kompetensi === 'K01')._count.kompetensi_mahasiswa = 1;
  await assert.rejects(() => service.hapusKompetensi('K01'), (e) => e.status === 409 && /masih dipakai/.test(e.message));

  const baru = await service.buatKompetensi({ nama_kompetensi: 'Sementara', kategori: 'X' });
  await service.hapusKompetensi(baru.kode_kompetensi);
  assert.equal((await service.daftarKompetensi()).length, 21);
  await assert.rejects(() => service.hapusKompetensi('K99'), (e) => e.status === 404);
});

test('referensi: the lists the forms need', async () => {
  const { service } = buat();
  const ref = await service.referensi();
  assert.deepEqual(ref.bidang, BIDANG);
  assert.deepEqual(ref.status_alternatif, ['Dipakai', 'Dikeluarkan']);
  assert.equal(ref.saran_kode_tempat, 'T18');
  assert.equal(ref.saran_kode_kompetensi, 'K22');
  assert.equal(ref.kompetensi.length, 21);
  assert.deepEqual(ref.batas_koordinat, { latMin: -11.5, latMax: 6.5, lonMin: 94.5, lonMax: 141.5 });
});

// ------------------------------------------------------- HTTP: access per role

const RUTE_ADMIN = [
  ['GET', '/api/admin/referensi'],
  ['GET', '/api/admin/kriteria'],
  ['PUT', '/api/admin/kriteria'],
  ['GET', '/api/admin/kompetensi'],
  ['POST', '/api/admin/kompetensi'],
  ['PUT', '/api/admin/kompetensi/K01'],
  ['DELETE', '/api/admin/kompetensi/K01'],
  ['GET', '/api/admin/tempat'],
  ['POST', '/api/admin/tempat'],
  ['GET', '/api/admin/tempat/T05'],
  ['PUT', '/api/admin/tempat/T05'],
  ['DELETE', '/api/admin/tempat/T05'],
];

test('/api/admin/*: a mahasiswa gets 403 and no session gets 401 on every route; the service is never called', async () => {
  const gagal = () => assert.fail('the service must not be called');
  const adminService = new Proxy({}, { get: () => gagal });
  await withApp({ adminService }, async (base) => {
    for (const [method, path] of RUTE_ADMIN) {
      const kirim = (headers) => sendJson(method, `${base}${path}`, method === 'GET' || method === 'DELETE' ? undefined : {}, headers);
      assert.equal((await kirim({})).status, 401, `${method} ${path} tanpa sesi`);
      assert.equal((await kirim(cookie('tok-mhs'))).status, 403, `${method} ${path} sebagai mahasiswa`);
    }
  });
});

test('/api/admin/*: the administrator reaches the service and gets its answer; errors keep their field messages', async () => {
  const adminService = {
    daftarTempat: async () => [{ kode_tempat: 'T01' }],
    buatTempat: async () => {
      const { HttpError } = await import('../src/lib/httpError.js');
      throw new HttpError(422, 'Data belum valid. Periksa bagian yang ditandai.', { kesalahan: { latitude: 'di luar Indonesia' } });
    },
    hapusTempat: async () => {},
  };
  await withApp({ adminService }, async (base) => {
    const daftar = await fetch(`${base}/api/admin/tempat`, { headers: cookie('tok-admin') });
    assert.equal(daftar.status, 200);
    assert.deepEqual(await daftar.json(), { tempat: [{ kode_tempat: 'T01' }] });

    const salah = await sendJson('POST', `${base}/api/admin/tempat`, {}, cookie('tok-admin'));
    assert.equal(salah.status, 422);
    assert.deepEqual((await salah.json()).kesalahan, { latitude: 'di luar Indonesia' });

    const hapus = await sendJson('DELETE', `${base}/api/admin/tempat/T18`, undefined, cookie('tok-admin'));
    assert.equal(hapus.status, 204);
  });
});

test('GET /api/kompetensi: any signed-in user, 401 without a session; shape of the profile-form contract', async () => {
  const kompetensiService = createKompetensiService({ repository: fakeAdminRepository() });
  await withApp({ kompetensiService }, async (base) => {
    assert.equal((await fetch(`${base}/api/kompetensi`)).status, 401);
    for (const token of ['tok-mhs', 'tok-admin']) {
      const res = await fetch(`${base}/api/kompetensi`, { headers: cookie(token) });
      assert.equal(res.status, 200);
      const daftar = await res.json();
      assert.equal(daftar.length, 21);
      assert.deepEqual(Object.keys(daftar[0]), ['kompetensi_id', 'nama_kompetensi', 'kategori', 'deskripsi', 'skala_maksimum']);
      assert.equal(daftar[0].kompetensi_id, 'K01');
    }
  });
});
