import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIDANG } from '../src/engine/src/config.js';
import {
  BATAS_INDONESIA,
  kodeBerikutnya,
  validasiBobot,
  validasiKompetensi,
  validasiTempat,
} from '../src/services/validasi-admin.js';

const kodeKompetensi = new Set(['K01', 'K02', 'K03']);
const SEKARANG = new Date('2026-11-19T00:00:00.000Z');

const tempatValid = (ubah = {}) => ({
  nama_perusahaan: 'PT Contoh Maju',
  posisi: 'Web Intern',
  bidang_industri: 'Web Development',
  lokasi: 'Manado',
  latitude: 1.4748,
  longitude: 124.8421,
  mode_kerja: 'On-site',
  benefit_finansial: 1.5,
  reputasi: 4,
  status_alternatif: 'Dipakai',
  alasan_dikeluarkan: null,
  sumber_url: 'https://contoh.id/lowongan/1',
  tanggal_akses: '2026-11-05',
  kebutuhan: [
    { kompetensi: 'K01', level_minimum: 2, wajib: true },
    { kompetensi: 'K02', level_minimum: 1, wajib: false },
  ],
  ...ubah,
});
const cek = (input, mode = 'baru') => validasiTempat(input, { kodeKompetensi, mode, sekarang: SEKARANG });
const adaGalat = (hasil, field) => assert.ok(hasil.kesalahan[field], `harus ada galat untuk ${field}: ${JSON.stringify(hasil.kesalahan)}`);

// ----------------------------------------------------------------- tempat magang

test('tempat: a complete valid form has no errors and is normalised', () => {
  const hasil = cek(tempatValid({ nama_perusahaan: '  PT Contoh Maju  ', benefit_finansial: '1,5', latitude: '1.4748' }));
  assert.deepEqual(hasil.kesalahan, {});
  assert.equal(hasil.data.nama_perusahaan, 'PT Contoh Maju');
  assert.equal(hasil.data.benefit_finansial, 1.5);
  assert.equal(hasil.data.latitude, 1.4748);
  assert.equal(hasil.kebutuhan.length, 2);
});

test('tempat: required fields', () => {
  const hasil = cek({ kebutuhan: [] });
  for (const field of ['nama_perusahaan', 'posisi', 'bidang_industri', 'lokasi', 'status_alternatif']) adaGalat(hasil, field);
});

test('tempat: bidang_industri must be one of the engine BIDANG values (the engine throws on any other)', () => {
  for (const bidang of BIDANG) assert.deepEqual(cek(tempatValid({ bidang_industri: bidang })).kesalahan, {}, bidang);
  for (const bidang of ['QA', 'Web', 'web development', 'Biologi']) {
    adaGalat(cek(tempatValid({ bidang_industri: bidang })), 'bidang_industri');
  }
});

test('koordinat: inside Indonesia is accepted, including the edges (Batasan 3)', () => {
  const { latMin, latMax, lonMin, lonMax } = BATAS_INDONESIA;
  assert.deepEqual([latMin, latMax, lonMin, lonMax], [-11.5, 6.5, 94.5, 141.5]);
  for (const [latitude, longitude] of [[1.4748, 124.8421], [-6.2615, 106.8106], [latMin, lonMin], [latMax, lonMax], [0, 120]]) {
    assert.deepEqual(cek(tempatValid({ latitude, longitude })).kesalahan, {}, `${latitude},${longitude}`);
  }
});

test('koordinat: outside Indonesia is refused with a clear message', () => {
  for (const [latitude, longitude] of [[51.5074, -0.1278], [-11.6, 120], [6.6, 120], [0, 94.4], [0, 141.6], [35.68, 139.69]]) {
    const hasil = cek(tempatValid({ latitude, longitude }));
    assert.ok(hasil.kesalahan.latitude || hasil.kesalahan.longitude, `${latitude},${longitude} harus ditolak`);
  }
  const lintang = cek(tempatValid({ latitude: 51.5, longitude: 120 })).kesalahan.latitude;
  assert.match(lintang, /di luar wilayah Indonesia/);
  assert.match(lintang, /-11,5 dan 6,5/);
  const bujur = cek(tempatValid({ latitude: 0, longitude: -0.12 })).kesalahan.longitude;
  assert.match(bujur, /94,5 dan 141,5/);
});

test('koordinat: both or none, numbers only, at most 6 decimals', () => {
  adaGalat(cek(tempatValid({ latitude: 1.4, longitude: null })), 'longitude');
  adaGalat(cek(tempatValid({ latitude: null, longitude: 120 })), 'latitude');
  adaGalat(cek(tempatValid({ latitude: 'abc' })), 'latitude');
  adaGalat(cek(tempatValid({ latitude: 1.1234567 })), 'latitude');
  // empty coordinates are fine for a tempat that is not in use
  const keluar = cek(tempatValid({ latitude: '', longitude: '', status_alternatif: 'Dikeluarkan', alasan_dikeluarkan: 'Alamat belum ketemu' }));
  assert.deepEqual(keluar.kesalahan, {});
});

test('kebutuhan: level_minimum must be a whole number from 1 to 4', () => {
  for (const level of [1, 2, 3, 4, '3']) {
    assert.deepEqual(cek(tempatValid({ kebutuhan: [{ kompetensi: 'K01', level_minimum: level, wajib: true }] })).kesalahan, {}, String(level));
  }
  for (const level of [0, 5, -1, 2.5, 'tinggi', null, undefined]) {
    const hasil = cek(tempatValid({ kebutuhan: [{ kompetensi: 'K01', level_minimum: level, wajib: true }] }));
    adaGalat(hasil, 'kebutuhan[0].level_minimum');
  }
});

test('kebutuhan: known, unique kompetensi and an explicit wajib/opsional', () => {
  adaGalat(cek(tempatValid({ kebutuhan: [{ kompetensi: 'K99', level_minimum: 2, wajib: true }] })), 'kebutuhan[0].kompetensi');
  adaGalat(cek(tempatValid({ kebutuhan: [{ kompetensi: '', level_minimum: 2, wajib: true }] })), 'kebutuhan[0].kompetensi');
  const ganda = cek(tempatValid({ kebutuhan: [
    { kompetensi: 'K01', level_minimum: 2, wajib: true },
    { kompetensi: 'K01', level_minimum: 3, wajib: false },
  ] }));
  adaGalat(ganda, 'kebutuhan[1].kompetensi');
  adaGalat(cek(tempatValid({ kebutuhan: [{ kompetensi: 'K01', level_minimum: 2, wajib: 'ya' }] })), 'kebutuhan[0].wajib');
  adaGalat(cek(tempatValid({ kebutuhan: 'bukan daftar' })), 'kebutuhan');
});

test('Dipakai needs at least one wajib kompetensi', () => {
  adaGalat(cek(tempatValid({ kebutuhan: [] })), 'kebutuhan');
  adaGalat(cek(tempatValid({ kebutuhan: [{ kompetensi: 'K02', level_minimum: 1, wajib: false }] })), 'kebutuhan');
  assert.match(cek(tempatValid({ kebutuhan: [] })).kesalahan.kebutuhan, /minimal satu kompetensi wajib/);
  // Dikeluarkan may have none
  const keluar = cek(tempatValid({ status_alternatif: 'Dikeluarkan', alasan_dikeluarkan: 'Remote', kebutuhan: [] }));
  assert.deepEqual(keluar.kesalahan, {});
});

test('Dipakai needs coordinates and must not be remote/WFH (the engine would silently exclude it)', () => {
  adaGalat(cek(tempatValid({ latitude: null, longitude: null })), 'latitude');
  for (const mode of ['Remote/WFH', 'remote', 'WFH', 'Full Remote']) {
    adaGalat(cek(tempatValid({ mode_kerja: mode })), 'mode_kerja');
  }
  for (const mode of ['On-site', 'Hybrid', 'Tidak dinyatakan', 'On-site (WFO)', null]) {
    assert.deepEqual(cek(tempatValid({ mode_kerja: mode })).kesalahan, {}, String(mode));
  }
  // a remote lowongan is fine as Dikeluarkan
  const keluar = cek(tempatValid({ mode_kerja: 'Remote/WFH', status_alternatif: 'Dikeluarkan', alasan_dikeluarkan: 'Remote (Batasan 3)' }));
  assert.deepEqual(keluar.kesalahan, {});
});

test('status: only Dipakai or Dikeluarkan; Dikeluarkan needs a reason; Dipakai drops the reason', () => {
  adaGalat(cek(tempatValid({ status_alternatif: 'Aktif' })), 'status_alternatif');
  adaGalat(cek(tempatValid({ status_alternatif: 'Dikeluarkan', alasan_dikeluarkan: '  ' })), 'alasan_dikeluarkan');
  const dipakai = cek(tempatValid({ alasan_dikeluarkan: 'sisa lama' }));
  assert.equal(dipakai.data.alasan_dikeluarkan, null);
});

test('benefit and reputasi are optional, with their ranges', () => {
  assert.deepEqual(cek(tempatValid({ benefit_finansial: null, reputasi: null })).kesalahan, {});
  assert.deepEqual(cek(tempatValid({ benefit_finansial: '', reputasi: '' })).kesalahan, {});
  assert.deepEqual(cek(tempatValid({ benefit_finansial: 0, reputasi: 1 })).kesalahan, {});
  for (const reputasi of [0, 6, 3.5, 'bagus']) adaGalat(cek(tempatValid({ reputasi })), 'reputasi');
  for (const benefit of [-1, 1.234, 'banyak', 1e7]) adaGalat(cek(tempatValid({ benefit_finansial: benefit })), 'benefit_finansial');
});

test('sumber_url must be an http(s) address; tanggal_akses a real date that is not in the future', () => {
  for (const url of ['ftp://x.id/a', 'javascript:alert(1)', 'bukan url', 'www.contoh.id']) adaGalat(cek(tempatValid({ sumber_url: url })), 'sumber_url');
  assert.deepEqual(cek(tempatValid({ sumber_url: null, tanggal_akses: null })).kesalahan, {});
  for (const tanggal of ['2026-02-30', '05-11-2026', 'kemarin', '2026-11-20']) adaGalat(cek(tempatValid({ tanggal_akses: tanggal })), 'tanggal_akses');
  assert.deepEqual(cek(tempatValid({ tanggal_akses: '2026-11-19' })).kesalahan, {}); // today is fine
});

test('kode_tempat: T + digits when given on create; helper suggests the next free code', () => {
  assert.deepEqual(cek(tempatValid({ kode_tempat: 'T18' })).kesalahan, {});
  for (const kode of ['18', 'X18', 'T1', 'T 18']) adaGalat(cek(tempatValid({ kode_tempat: kode })), 'kode_tempat');
  assert.equal(kodeBerikutnya('T', ['T01', 'T02', 'T17']), 'T18');
  assert.equal(kodeBerikutnya('K', []), 'K01');
  assert.equal(kodeBerikutnya('K', ['K09', 'K99']), 'K100');
});

// -------------------------------------------------------------------- kompetensi

test('kompetensi: nama and kategori are required, deskripsi optional', () => {
  const hasil = validasiKompetensi({}, { namaLain: [], mode: 'baru' });
  adaGalat(hasil, 'nama_kompetensi');
  adaGalat(hasil, 'kategori');
  const ok = validasiKompetensi({ nama_kompetensi: ' Docker ', kategori: ' Tools ', deskripsi: '' }, { namaLain: [], mode: 'baru' });
  assert.deepEqual(ok.kesalahan, {});
  assert.equal(ok.data.nama_kompetensi, 'Docker');
  assert.equal(ok.data.deskripsi, null);
});

test('kompetensi: the name must be unique, ignoring case and spacing, except against itself', () => {
  const lain = ['Dasar Pemrograman', 'Basis Data SQL'];
  adaGalat(validasiKompetensi({ nama_kompetensi: 'dasar  PEMROGRAMAN', kategori: 'X' }, { namaLain: lain, mode: 'baru' }), 'nama_kompetensi');
  assert.deepEqual(validasiKompetensi({ nama_kompetensi: 'Dasar Pemrograman', kategori: 'X' }, { namaLain: ['Basis Data SQL'], mode: 'ubah' }).kesalahan, {});
});

test('kompetensi: lengths, and the scale is fixed at 4 whatever the input says', () => {
  adaGalat(validasiKompetensi({ nama_kompetensi: 'x'.repeat(256), kategori: 'X' }, { namaLain: [], mode: 'baru' }), 'nama_kompetensi');
  adaGalat(validasiKompetensi({ nama_kompetensi: 'A', kategori: 'k'.repeat(101) }, { namaLain: [], mode: 'baru' }), 'kategori');
  adaGalat(validasiKompetensi({ nama_kompetensi: 'A', kategori: 'K', deskripsi: 'd'.repeat(1001) }, { namaLain: [], mode: 'baru' }), 'deskripsi');
  const hasil = validasiKompetensi({ nama_kompetensi: 'A', kategori: 'K', skala_maksimum: 9 }, { namaLain: [], mode: 'baru' });
  assert.equal(hasil.data.skala_maksimum, 4);
  adaGalat(validasiKompetensi({ nama_kompetensi: 'A', kategori: 'K', kode_kompetensi: 'Z1' }, { namaLain: [], mode: 'baru' }), 'kode_kompetensi');
});

// ---------------------------------------------------------------------- kriteria

const KODE = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
const bobot = (nilai) => ({ bobot: Object.fromEntries(KODE.map((k, i) => [k, nilai[i]])) });

test('bobot: a total of exactly 1.00 is accepted', () => {
  const hasil = validasiBobot(bobot([0.3, 0.2, 0.15, 0.1, 0.1, 0.1, 0.05]), KODE);
  assert.deepEqual(hasil.kesalahan, {});
  assert.equal(hasil.total, 1);
  assert.deepEqual(hasil.bobot, { C1: 0.3, C2: 0.2, C3: 0.15, C4: 0.1, C5: 0.1, C6: 0.1, C7: 0.05 });
  // values that add up to 0.9999999999 in floating point still count as 1.00
  assert.deepEqual(validasiBobot(bobot([0.1, 0.2, 0.3, 0.4, 0, 0, 0]), KODE).kesalahan, {});
  assert.deepEqual(validasiBobot(bobot(['0,3', '0,2', '0,15', '0,1', '0,1', '0,1', '0,05']), KODE).kesalahan, {});
});

test('bobot: a total other than 1.00 is refused, however close', () => {
  for (const nilai of [
    [0.3, 0.2, 0.15, 0.1, 0.1, 0.1, 0.04], // 0.99
    [0.3, 0.2, 0.15, 0.1, 0.1, 0.1, 0.06], // 1.01
    [0.3, 0.2, 0.15, 0.1, 0.1, 0.1, 0.0499], // 0.9999
    [0.3, 0.2, 0.15, 0.1, 0.1, 0.1, 0.0501], // 1.0001
    [0.2, 0.2, 0.15, 0.1, 0.1, 0.1, 0.05], // 0.9
  ]) {
    const hasil = validasiBobot(bobot(nilai), KODE);
    adaGalat(hasil, 'total');
    assert.match(hasil.kesalahan.total, /harus tepat 1,00/);
  }
  assert.match(validasiBobot(bobot([0.3, 0.2, 0.15, 0.1, 0.1, 0.1, 0.04]), KODE).kesalahan.total, /Total bobot 0,99/);
});

test('bobot: each value 0..1 with at most 4 decimals; all criteria present; none unknown', () => {
  adaGalat(validasiBobot(bobot([-0.1, 0.5, 0.2, 0.1, 0.1, 0.1, 0.1]), KODE), 'C1');
  adaGalat(validasiBobot(bobot([1.2, 0, 0, 0, 0, 0, 0]), KODE), 'C1');
  adaGalat(validasiBobot(bobot([0.12345, 0.2, 0.15, 0.1, 0.1, 0.1, 0.05]), KODE), 'C1');
  adaGalat(validasiBobot(bobot(['abc', 0.2, 0.15, 0.1, 0.1, 0.1, 0.05]), KODE), 'C1');
  adaGalat(validasiBobot(bobot([null, 0.2, 0.15, 0.1, 0.1, 0.1, 0.05]), KODE), 'C1');
  adaGalat(validasiBobot({ bobot: { C1: 1 } }, KODE), 'C2'); // the others are missing
  adaGalat(validasiBobot({ bobot: { ...bobot([0.3, 0.2, 0.15, 0.1, 0.1, 0.1, 0.05]).bobot, C8: 0.1 } }, KODE), 'C8');
  adaGalat(validasiBobot({}, KODE), 'bobot');
  adaGalat(validasiBobot(null, KODE), 'bobot');
});

test('bobot: 0 is allowed but warned about ("tidak berpengaruh")', () => {
  const hasil = validasiBobot(bobot([0.4, 0.3, 0.15, 0, 0.1, 0.05, 0]), KODE);
  assert.deepEqual(hasil.kesalahan, {});
  assert.deepEqual(hasil.peringatan, [
    'C4: bobot 0, kriteria ini tidak berpengaruh pada hasil.',
    'C7: bobot 0, kriteria ini tidak berpengaruh pada hasil.',
  ]);
});
