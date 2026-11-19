import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from '../src/lib/httpError.js';
import { createPilihanService, ubahKeResponsPilihan } from '../src/services/pilihan.service.js';
import { cookie, sendJson, withApp } from './helpers.js';

// --- fakes, in the shape Prisma returns

const T05 = {
  tempat_id: 5,
  kode_tempat: 'T05',
  nama_perusahaan: 'PT Qtera Mandiri',
  posisi: 'Internship Front End Developer',
  status_alternatif: 'Dipakai',
  sumber_url: 'https://dealls.com/en/loker/contoh',
  tanggal_akses: new Date('2026-11-05T00:00:00Z'),
};
const T02 = { ...T05, tempat_id: 2, kode_tempat: 'T02', nama_perusahaan: 'Rakamin', status_alternatif: 'Dikeluarkan' };
const T01 = { ...T05, tempat_id: 1, kode_tempat: 'T01', nama_perusahaan: 'PT Wesclic', sumber_url: null, tanggal_akses: null };

const DIPILIH = new Date('2026-11-19T04:00:00.000Z');

function fakeRepository(overrides = {}) {
  const tempat = [T05, T02, T01];
  const state = { pilihan: new Map(), calls: [] };
  return {
    state,
    findMahasiswa: async (id) => (id === 1 || id === 2 ? { mahasiswa_id: id } : null),
    findTempatByKode: async (kode) => tempat.find((t) => t.kode_tempat === kode) ?? null,
    findHasilTopsis: async (id) =>
      id === 200 ? { topsis_id: 200, hasil_cga: { mahasiswa_id: 1, tempat_id: 5 } } : null,
    findPilihan: async (mahasiswaId) => state.pilihan.get(mahasiswaId) ?? null,
    simpanPilihan: async ({ mahasiswaId, tempatId, topsisId }) => {
      state.calls.push({ mahasiswaId, tempatId, topsisId });
      const row = {
        pilihan_id: 1,
        mahasiswa_id: mahasiswaId,
        tempat_id: tempatId,
        topsis_id: topsisId,
        dipilih_pada: DIPILIH,
        tempat_magang: tempat.find((t) => t.tempat_id === tempatId),
      };
      state.pilihan.set(mahasiswaId, row); // one row per mahasiswa: replaces the earlier choice
      return row;
    },
    hapusPilihan: async (mahasiswaId) => ({ count: state.pilihan.delete(mahasiswaId) ? 1 : 0 }),
    ...overrides,
  };
}

// --- service

test('ubahKeResponsPilihan: uses the tempat code (T05), never the numeric key', () => {
  const hasil = ubahKeResponsPilihan({ topsis_id: null, dipilih_pada: DIPILIH, tempat_magang: T05 });
  assert.deepEqual(hasil, {
    tempat_id: 'T05',
    namaPerusahaan: 'PT Qtera Mandiri',
    posisi: 'Internship Front End Developer',
    sumberUrl: 'https://dealls.com/en/loker/contoh',
    tanggalAkses: '2026-11-05',
    topsis_id: null,
    disimpan_pada: '2026-11-19T04:00:00.000Z',
  });
});

test('simpan: stores the choice by tempat code and returns it with the code', async () => {
  const repository = fakeRepository();
  const service = createPilihanService({ repository });
  const hasil = await service.simpan({ mahasiswaId: 1, kodeTempat: 'T05' });
  assert.equal(hasil.tempat_id, 'T05');
  assert.equal(hasil.namaPerusahaan, 'PT Qtera Mandiri');
  assert.deepEqual(repository.state.calls, [{ mahasiswaId: 1, tempatId: 5, topsisId: null }]);
});

test('simpan: a new choice replaces the old one (one active choice per mahasiswa)', async () => {
  const repository = fakeRepository();
  const service = createPilihanService({ repository });
  await service.simpan({ mahasiswaId: 1, kodeTempat: 'T05' });
  await service.simpan({ mahasiswaId: 1, kodeTempat: 'T01' });
  assert.equal(repository.state.pilihan.size, 1);
  assert.equal((await service.ambil(1)).tempat_id, 'T01');
  // another mahasiswa keeps a separate choice
  await service.simpan({ mahasiswaId: 2, kodeTempat: 'T05' });
  assert.equal(repository.state.pilihan.size, 2);
  assert.equal((await service.ambil(1)).tempat_id, 'T01');
});

test('simpan: topsis_id is stored when it is this mahasiswa\'s result for that tempat', async () => {
  const repository = fakeRepository();
  const service = createPilihanService({ repository });
  const hasil = await service.simpan({ mahasiswaId: 1, kodeTempat: 'T05', topsisId: 200 });
  assert.equal(hasil.topsis_id, 200);
});

test('simpan: 422 when topsis_id belongs to someone else, another tempat, or does not exist', async () => {
  const service = createPilihanService({ repository: fakeRepository() });
  await assert.rejects(() => service.simpan({ mahasiswaId: 2, kodeTempat: 'T05', topsisId: 200 }), (e) => e.status === 422);
  await assert.rejects(() => service.simpan({ mahasiswaId: 1, kodeTempat: 'T01', topsisId: 200 }), (e) => e.status === 422);
  await assert.rejects(() => service.simpan({ mahasiswaId: 1, kodeTempat: 'T05', topsisId: 999 }), (e) => e.status === 422);
});

test('simpan: 404 for an unknown mahasiswa or tempat, 422 for a lowongan that was excluded', async () => {
  const repository = fakeRepository();
  const service = createPilihanService({ repository });
  await assert.rejects(() => service.simpan({ mahasiswaId: 99, kodeTempat: 'T05' }), (e) => e.status === 404);
  await assert.rejects(() => service.simpan({ mahasiswaId: 1, kodeTempat: 'T99' }), (e) => e.status === 404);
  await assert.rejects(() => service.simpan({ mahasiswaId: 1, kodeTempat: 'T02' }), (e) => e.status === 422);
  assert.equal(repository.state.calls.length, 0);
});

test('ambil: null when there is no choice, 404 for an unknown mahasiswa', async () => {
  const service = createPilihanService({ repository: fakeRepository() });
  assert.equal(await service.ambil(1), null);
  await assert.rejects(() => service.ambil(99), (e) => e.status === 404);
});

test('hapus: removes the choice, is not an error when there is none, 404 for an unknown mahasiswa', async () => {
  const repository = fakeRepository();
  const service = createPilihanService({ repository });
  await service.simpan({ mahasiswaId: 1, kodeTempat: 'T05' });
  await service.hapus(1);
  assert.equal(await service.ambil(1), null);
  await service.hapus(1); // nothing left to remove
  await assert.rejects(() => service.hapus(99), (e) => e.status === 404);
});

// --- HTTP routes (service faked, so no database is needed). The mahasiswa is the
// signed-in one (id 7 in helpers.js): there is no id in the URL or the body.

const MAHASISWA_LOGIN = 7;

test('PUT /api/pilihan: 200 with the saved choice; the service gets the session mahasiswa and the code', async () => {
  const seen = [];
  const pilihanService = {
    simpan: async (args) => {
      seen.push(args);
      return { tempat_id: 'T05', namaPerusahaan: 'PT Qtera Mandiri', disimpan_pada: 'x' };
    },
  };
  await withApp({ pilihanService }, async (base) => {
    // a mahasiswa_id in the body is ignored
    const res = await sendJson(
      'PUT',
      `${base}/api/pilihan`,
      { mahasiswa_id: 999, tempat_id: ' T05 ', topsis_id: 200 },
      cookie('tok-mhs')
    );
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { tempat_id: 'T05', namaPerusahaan: 'PT Qtera Mandiri', disimpan_pada: 'x' });
    assert.deepEqual(seen, [{ mahasiswaId: MAHASISWA_LOGIN, kodeTempat: 'T05', topsisId: 200 }]);

    // topsis_id is optional
    await sendJson('PUT', `${base}/api/pilihan`, { tempat_id: 'T05' }, cookie('tok-mhs'));
    assert.equal(seen[1].topsisId, null);
  });
});

test('PUT /api/pilihan: 400 for a bad body, and the service is not called', async () => {
  const pilihanService = { simpan: async () => assert.fail('must not be called') };
  await withApp({ pilihanService }, async (base) => {
    for (const body of [
      {},
      { tempat_id: 5 }, // a number is not a code
      { tempat_id: '  ' },
      { tempat_id: 'T05', topsis_id: 'abc' },
      { tempat_id: 'T05', topsis_id: -3 },
      '{oops',
    ]) {
      const res = await sendJson('PUT', `${base}/api/pilihan`, body, cookie('tok-mhs'));
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });
});

test('GET /api/pilihan: 200 with the choice of the signed-in mahasiswa, or null when there is none', async () => {
  const pilihan = { tempat_id: 'T05', namaPerusahaan: 'PT Qtera Mandiri' };
  const pilihanService = { ambil: async (id) => (id === MAHASISWA_LOGIN ? pilihan : null) };
  await withApp({ pilihanService }, async (base) => {
    const ada = await fetch(`${base}/api/pilihan`, { headers: cookie('tok-mhs') });
    assert.equal(ada.status, 200);
    assert.deepEqual(await ada.json(), pilihan);
  });
  await withApp({ pilihanService: { ambil: async () => null } }, async (base) => {
    const kosong = await fetch(`${base}/api/pilihan`, { headers: cookie('tok-mhs') });
    assert.equal(kosong.status, 200);
    assert.equal(await kosong.json(), null);
  });
});

test('DELETE /api/pilihan: 204 with an empty body, for the signed-in mahasiswa', async () => {
  let dihapus = null;
  const pilihanService = {
    hapus: async (id) => {
      dihapus = id;
    },
  };
  await withApp({ pilihanService }, async (base) => {
    const res = await fetch(`${base}/api/pilihan`, { method: 'DELETE', headers: cookie('tok-mhs') });
    assert.equal(res.status, 204);
    assert.equal(await res.text(), '');
    assert.equal(dihapus, MAHASISWA_LOGIN);
  });
});

test('/api/pilihan: 401 without a session and 403 for the administrator, service not called', async () => {
  const gagal = () => assert.fail('must not be called');
  const pilihanService = { simpan: gagal, ambil: gagal, hapus: gagal };
  await withApp({ pilihanService }, async (base) => {
    for (const headers of [{}, cookie('tok-admin')]) {
      const status = headers.cookie ? 403 : 401;
      assert.equal((await sendJson('PUT', `${base}/api/pilihan`, { tempat_id: 'T05' }, headers)).status, status);
      assert.equal((await fetch(`${base}/api/pilihan`, { headers })).status, status);
      assert.equal((await fetch(`${base}/api/pilihan`, { method: 'DELETE', headers })).status, status);
    }
  });
});

test('/api/pilihan: HttpError status passes through (404, 422)', async () => {
  const pilihanService = {
    simpan: async () => {
      throw new HttpError(422, 'tidak bisa dipilih');
    },
    ambil: async () => {
      throw new HttpError(404, 'tidak ditemukan');
    },
  };
  await withApp({ pilihanService }, async (base) => {
    const put = await sendJson('PUT', `${base}/api/pilihan`, { tempat_id: 'T02' }, cookie('tok-mhs'));
    assert.equal(put.status, 422);
    assert.deepEqual(await put.json(), { error: 'tidak bisa dipilih' });
    const get = await fetch(`${base}/api/pilihan`, { headers: cookie('tok-mhs') });
    assert.equal(get.status, 404);
  });
});

