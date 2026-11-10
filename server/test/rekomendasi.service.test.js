import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criteriaC1C7 } from '../engine/spk-engine/src/index.js';
import {
  buatKriteriaEngine,
  createRekomendasiService,
  hitungKesesuaianBidang,
} from '../src/services/rekomendasi.service.js';
import { HttpError } from '../src/lib/httpError.js';

const CONFIG = { ncf: 0.6, nsf: 0.4, c7Placeholder: 0 };

const kriteriaRows = () =>
  criteriaC1C7().map((c, i) => ({
    kriteria_id: i + 1,
    kode_kriteria: c.code,
    nama_kriteria: c.label,
    bobot: c.weight,
    tipe: c.type,
  }));

const kebutuhan = (tempat_id, kompetensi_id, level_minimum, is_mandatory) => ({
  tempat_id,
  kompetensi_id,
  level_minimum,
  is_mandatory,
  kompetensi: { nama_kompetensi: `K${kompetensi_id}`, skala_maksimum: 4 },
});

// Mahasiswa: levels K1=3, K2=3, no K3. IPK 3.5, minat 'web', domisili (0,0).
const mahasiswa = {
  mahasiswa_id: 1,
  nim: '2020001',
  nama: 'Uji',
  ipk: '3.50',
  minat_bidang: 'web',
  domisili_latitude: 0,
  domisili_longitude: 0,
  kompetensi_mahasiswa: [
    { kompetensi_id: 1, level_penguasaan: 3 },
    { kompetensi_id: 2, level_penguasaan: 3 },
  ],
};

const tempatList = [
  {
    // A: K1 wajib lvl3 (gap 0 -> 4.0), K2 opsional lvl2 (gap +1 -> 4.5)
    // S_komp = 0.6*4.0 + 0.4*4.5 = 4.2 -> 4.2/4.5*100 = 93.333...
    tempat_id: 10,
    nama_perusahaan: 'A',
    bidang_industri: 'web',
    latitude: 0,
    longitude: 0.1,
    benefit_finansial: '2.00',
    reputasi: 4,
    kebutuhan_kompetensi: [kebutuhan(10, 1, 3, true), kebutuhan(10, 2, 2, false)],
  },
  {
    // B: K1 wajib lvl4 (gap -1 -> 3.5), K2 opsional lvl3 (gap 0 -> 4.0)
    // S_komp = 0.6*3.5 + 0.4*4.0 = 3.7 -> 3.7/4.5*100 = 82.222...
    tempat_id: 11,
    nama_perusahaan: 'B',
    bidang_industri: 'data',
    latitude: 0,
    longitude: 1,
    benefit_finansial: '1.00',
    reputasi: 3,
    kebutuhan_kompetensi: [kebutuhan(11, 1, 4, true), kebutuhan(11, 2, 3, false)],
  },
  {
    tempat_id: 12,
    nama_perusahaan: 'C (tanpa koordinat)',
    bidang_industri: 'web',
    latitude: null,
    longitude: null,
    benefit_finansial: '1.00',
    reputasi: 3,
    kebutuhan_kompetensi: [kebutuhan(12, 1, 3, true), kebutuhan(12, 2, 3, false)],
  },
  {
    // D: K3 is wajib but the mahasiswa has no K3 -> incomplete profile for CGA
    tempat_id: 13,
    nama_perusahaan: 'D',
    bidang_industri: 'web',
    latitude: 0,
    longitude: 0.5,
    benefit_finansial: '1.00',
    reputasi: 3,
    kebutuhan_kompetensi: [kebutuhan(13, 3, 2, true), kebutuhan(13, 2, 3, false)],
  },
];

function fakeRepository(overrides = {}) {
  const calls = { simpanHasil: [] };
  return {
    calls,
    findMahasiswa: async () => mahasiswa,
    findKriteria: async () => kriteriaRows(),
    findPemetaanBidang: async () => [{ minat_bidang: 'web', bidang_industri: 'data', nilai_kesesuaian: '50.00' }],
    findTempatDenganKebutuhan: async () => tempatList,
    simpanHasil: async (mahasiswaId, items) => {
      calls.simpanHasil.push({ mahasiswaId, items });
      return items.map((it, i) => ({ tempatId: it.tempatId, cgaId: 100 + i, topsisId: 200 + i }));
    },
    ...overrides,
  };
}

test('hitungKesesuaianBidang: 100 if identical, mapped value if serumpun, else 0', () => {
  const pemetaan = [{ minat_bidang: 'web', bidang_industri: 'data', nilai_kesesuaian: '50.00' }];
  assert.equal(hitungKesesuaianBidang('Web', ' web ', pemetaan), 100);
  assert.equal(hitungKesesuaianBidang('web', 'data', pemetaan), 50);
  assert.equal(hitungKesesuaianBidang('web', 'jaringan', pemetaan), 0);
});

test('buatKriteriaEngine: maps rows to engine criteria in C1..C7 order', () => {
  const criteria = buatKriteriaEngine([...kriteriaRows()].reverse());
  assert.deepEqual(criteria.map((c) => c.code), ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']);
  assert.equal(criteria[0].weight, 0.3);
  assert.equal(criteria[3].type, 'cost');
});

test('buatKriteriaEngine: rejects missing criteria and invalid tipe', () => {
  assert.throws(() => buatKriteriaEngine(kriteriaRows().slice(0, 6)), HttpError);
  const bad = kriteriaRows();
  bad[0].tipe = 'maksimum';
  assert.throws(() => buatKriteriaEngine(bad), HttpError);
});

test('hitungRekomendasi: hand-calculated CGA, C2, ranking, exclusions, persistence', async () => {
  const repository = fakeRepository();
  const service = createRekomendasiService({ repository, getConfig: () => CONFIG });
  const hasil = await service.hitungRekomendasi(1);

  // A beats B on C1, C2, C4 (closer), C5, C6; C3 and C7 are constant -> Ci(A)=1, Ci(B)=0.
  assert.deepEqual(hasil.rekomendasi.map((r) => r.nama_perusahaan), ['A', 'B']);
  const [a, b] = hasil.rekomendasi;
  assert.equal(a.ranking, 1);
  assert.ok(Math.abs(a.nilai_preferensi - 1) < 1e-12);
  assert.ok(Math.abs(b.nilai_preferensi - 0) < 1e-12);

  // CGA -> C1 (hand-calculated in the fixture comments)
  assert.ok(Math.abs(a.nilai_kriteria.C1 - (4.2 / 4.5) * 100) < 1e-9);
  assert.ok(Math.abs(b.nilai_kriteria.C1 - (3.7 / 4.5) * 100) < 1e-9);
  assert.equal(a.compatibility_score, a.nilai_kriteria.C1);

  // C2..C7 inputs
  assert.equal(a.nilai_kriteria.C2, 100);
  assert.equal(b.nilai_kriteria.C2, 50);
  assert.equal(a.nilai_kriteria.C3, 3.5);
  assert.ok(Math.abs(a.nilai_kriteria.C4 - (2 * Math.PI * 6371 * 0.1) / 360) < 1e-9);
  assert.equal(a.nilai_kriteria.C5, 2);
  assert.equal(a.nilai_kriteria.C6, 4);
  assert.equal(a.nilai_kriteria.C7, 0);

  // C (no coordinates) and D (mandatory K3 unassessed) are reported, not silently dropped
  assert.deepEqual(hasil.tidak_dapat_dihitung.map((t) => t.tempat_id).sort(), [12, 13]);
  assert.match(hasil.tidak_dapat_dihitung.find((t) => t.tempat_id === 13).alasan, /Mandatory competency "3"/);

  // Persistence: one call, ranked order, generated ids come back in the response
  assert.equal(repository.calls.simpanHasil.length, 1);
  const { mahasiswaId, items } = repository.calls.simpanHasil[0];
  assert.equal(mahasiswaId, 1);
  assert.deepEqual(items.map((i) => [i.tempatId, i.ranking]), [[10, 1], [11, 2]]);
  assert.deepEqual(items[0].detail.map((d) => [d.kompetensi_id, d.gap, d.nilai_bobot, d.is_mandatory]), [
    [1, 0, 4, true],
    [2, 1, 4.5, false],
  ]);
  assert.equal(a.cga_id, 100);
  assert.equal(a.topsis_id, 200);

  // Intermediate steps are exposed for BAB IV
  const steps = hasil.langkah_perhitungan;
  assert.ok(Math.abs(steps.cga[0].s_komp - 4.2) < 1e-9);
  assert.equal(steps.topsis.matriks_keputusan.length, 2);
  assert.equal(steps.topsis.matriks_ternormalisasi[0].length, 7);
  assert.equal(steps.topsis.solusi_ideal_positif.length, 7);
  assert.deepEqual(steps.topsis.tempat_id, [10, 11]);

  // Open issues are always flagged (C3 / C7) and the engine's constant-column warning surfaces
  assert.ok(hasil.peringatan.some((w) => w.startsWith('C3')));
  assert.ok(hasil.peringatan.some((w) => w.startsWith('C7')));
  assert.ok(hasil.peringatan.some((w) => w.includes('Criterion C3 has an identical value')));
});

test('hitungRekomendasi: 404 for unknown mahasiswa, 422 without domisili coordinates', async () => {
  const notFound = createRekomendasiService({
    repository: fakeRepository({ findMahasiswa: async () => null }),
    getConfig: () => CONFIG,
  });
  await assert.rejects(() => notFound.hitungRekomendasi(99), (e) => e.status === 404);

  const noCoords = createRekomendasiService({
    repository: fakeRepository({ findMahasiswa: async () => ({ ...mahasiswa, domisili_latitude: null }) }),
    getConfig: () => CONFIG,
  });
  await assert.rejects(() => noCoords.hitungRekomendasi(1), (e) => e.status === 422);
});

test('hitungRekomendasi: 422 and nothing persisted when no tempat magang can be computed', async () => {
  const repository = fakeRepository({ findTempatDenganKebutuhan: async () => [tempatList[2]] });
  const service = createRekomendasiService({ repository, getConfig: () => CONFIG });
  await assert.rejects(
    () => service.hitungRekomendasi(1),
    (e) => e.status === 422 && e.details.tidak_dapat_dihitung.length === 1
  );
  assert.equal(repository.calls.simpanHasil.length, 0);
});

test('hitungRekomendasi: 422 and nothing persisted when kriteria_topsis weights do not sum to 1.0', async () => {
  const rows = kriteriaRows();
  rows[0].bobot = 0.5; // sum becomes 1.2
  const repository = fakeRepository({ findKriteria: async () => rows });
  const service = createRekomendasiService({ repository, getConfig: () => CONFIG });
  await assert.rejects(() => service.hitungRekomendasi(1), (e) => e.status === 422);
  assert.equal(repository.calls.simpanHasil.length, 0);
});
