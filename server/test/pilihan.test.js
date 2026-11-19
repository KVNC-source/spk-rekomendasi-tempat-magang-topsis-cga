import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { HttpError } from '../src/lib/httpError.js';
import { createPilihanService, ubahKeResponsPilihan } from '../src/services/pilihan.service.js';

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

// --- HTTP routes (service faked, so no database is needed)

async function withServer(pilihanService, fn) {
  const server = createApp({ rekomendasiService: {}, pilihanService }).listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

const json = (method, url, body) =>
  fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

test('PUT /api/pilihan: 200 with the saved choice; the service gets the code and the ids', async () => {
  const seen = [];
  const service = {
    simpan: async (args) => {
      seen.push(args);
      return { tempat_id: 'T05', namaPerusahaan: 'PT Qtera Mandiri', disimpan_pada: 'x' };
    },
  };
  await withServer(service, async (base) => {
    const res = await json('PUT', `${base}/api/pilihan`, { mahasiswa_id: 1, tempat_id: ' T05 ', topsis_id: 200 });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { tempat_id: 'T05', namaPerusahaan: 'PT Qtera Mandiri', disimpan_pada: 'x' });
    assert.deepEqual(seen, [{ mahasiswaId: 1, kodeTempat: 'T05', topsisId: 200 }]);

    // topsis_id is optional
    await json('PUT', `${base}/api/pilihan`, { mahasiswa_id: 1, tempat_id: 'T05' });
    assert.equal(seen[1].topsisId, null);
  });
});

test('PUT /api/pilihan: 400 for a bad body, and the service is not called', async () => {
  const service = { simpan: async () => assert.fail('must not be called') };
  await withServer(service, async (base) => {
    for (const body of [
      {},
      { mahasiswa_id: '1', tempat_id: 'T05' },
      { mahasiswa_id: 0, tempat_id: 'T05' },
      { mahasiswa_id: 1 },
      { mahasiswa_id: 1, tempat_id: 5 }, // a number is not a code
      { mahasiswa_id: 1, tempat_id: '  ' },
      { mahasiswa_id: 1, tempat_id: 'T05', topsis_id: 'abc' },
      { mahasiswa_id: 1, tempat_id: 'T05', topsis_id: -3 },
      '{oops',
    ]) {
      assert.equal((await json('PUT', `${base}/api/pilihan`, body)).status, 400, JSON.stringify(body));
    }
  });
});

test('GET /api/pilihan/:mahasiswa_id: 200 with the choice, or null when there is none', async () => {
  const pilihan = { tempat_id: 'T05', namaPerusahaan: 'PT Qtera Mandiri' };
  const service = { ambil: async (id) => (id === 1 ? pilihan : null) };
  await withServer(service, async (base) => {
    const ada = await fetch(`${base}/api/pilihan/1`);
    assert.equal(ada.status, 200);
    assert.deepEqual(await ada.json(), pilihan);

    const kosong = await fetch(`${base}/api/pilihan/2`);
    assert.equal(kosong.status, 200);
    assert.equal(await kosong.json(), null);
  });
});

test('GET and DELETE /api/pilihan/:id: 400 for an id that is not a positive integer', async () => {
  const service = { ambil: async () => assert.fail('no'), hapus: async () => assert.fail('no') };
  await withServer(service, async (base) => {
    for (const id of ['abc', '0', '-1', '1.5']) {
      assert.equal((await fetch(`${base}/api/pilihan/${id}`)).status, 400, `GET ${id}`);
      assert.equal((await fetch(`${base}/api/pilihan/${id}`, { method: 'DELETE' })).status, 400, `DELETE ${id}`);
    }
  });
});

test('DELETE /api/pilihan/:id: 204 with an empty body', async () => {
  let dihapus = null;
  const service = { hapus: async (id) => { dihapus = id; } };
  await withServer(service, async (base) => {
    const res = await fetch(`${base}/api/pilihan/7`, { method: 'DELETE' });
    assert.equal(res.status, 204);
    assert.equal(await res.text(), '');
    assert.equal(dihapus, 7);
  });
});

test('/api/pilihan: HttpError status passes through (404, 422)', async () => {
  const service = {
    simpan: async () => { throw new HttpError(422, 'tidak bisa dipilih'); },
    ambil: async () => { throw new HttpError(404, 'tidak ditemukan'); },
  };
  await withServer(service, async (base) => {
    const put = await json('PUT', `${base}/api/pilihan`, { mahasiswa_id: 1, tempat_id: 'T02' });
    assert.equal(put.status, 422);
    assert.deepEqual(await put.json(), { error: 'tidak bisa dipilih' });
    const get = await fetch(`${base}/api/pilihan/99`);
    assert.equal(get.status, 404);
  });
});
