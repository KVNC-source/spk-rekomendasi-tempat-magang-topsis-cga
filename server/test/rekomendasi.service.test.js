import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recommend } from '../src/engine/src/matrix.js';
import { criteriaC1C7 } from '../src/engine/src/topsis.js';
import { ubahKeDataset } from '../src/services/dataset.js';
import {
  buatKriteriaEngine,
  createRekomendasiService,
  ubahKeProfilEngine,
} from '../src/services/rekomendasi.service.js';
import { HttpError } from '../src/lib/httpError.js';

const readJson = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const dataset = readJson('../src/engine/data/dataset.json');
const profilContoh = readJson('../src/engine/data/profil_contoh.json').profil.find((p) => p.id === 'CONTOH-WEB-MANADO');

const CONFIG = { ncf: 0.6, nsf: 0.4, c7Placeholder: 4 };
const NOW = new Date('2026-11-17T08:00:00.000Z');
const DIPERBARUI = new Date('2026-11-16T09:30:00.000Z');

// --- Database rows built from dataset.json, in the shape Prisma returns them.

const kompetensiRows = dataset.kompetensi.map((k, i) => ({
  kompetensi_id: i + 1,
  kode_kompetensi: k.id,
  nama_kompetensi: k.nama,
  skala_maksimum: 4,
}));

const decimal = (value) => (value === null || value === undefined ? null : String(value));

const tempatRows = dataset.tempat.map((t, i) => ({
  tempat_id: i + 1,
  kode_tempat: t.tempatId,
  nama_perusahaan: t.namaPerusahaan,
  posisi: t.posisi,
  bidang_industri: t.bidang,
  lokasi: t.lokasi,
  mode_kerja: t.modeKerja,
  latitude: decimal(t.lat),
  longitude: decimal(t.lon),
  benefit_finansial: decimal(t.benefitFinansial),
  reputasi: t.reputasi,
  status_alternatif: t.statusAlternatif,
  alasan_dikeluarkan: t.alasanDikeluarkan,
  sumber_url: t.sumberUrl,
  tanggal_akses: t.tanggalAkses ? new Date(`${t.tanggalAkses}T00:00:00Z`) : null,
  kebutuhan_kompetensi: dataset.kebutuhan
    .filter((k) => k.tempatId === t.tempatId)
    .map((k) => ({
      kebutuhan_id: Number(k.kebutuhanId.replace('KB', '')),
      level_minimum: k.levelMinimum,
      is_mandatory: k.jenis === 'wajib',
      kompetensi: { kode_kompetensi: k.kompetensiId },
    })),
}));

const kriteriaRows = () =>
  criteriaC1C7().map((c, i) => ({
    kriteria_id: i + 1,
    kode_kriteria: c.code,
    nama_kriteria: c.label,
    bobot: String(c.weight),
    tipe: c.type,
  }));

/** The sample profile with all 21 answers (missing ones are an explicit level 0). */
const mahasiswa = {
  mahasiswa_id: 1,
  nim: 'CONTOH-0001',
  nama: 'CONTOH Mahasiswa Web Manado',
  ipk: String(profilContoh.ipk),
  minat_bidang: profilContoh.minatBidang,
  domisili_latitude: String(profilContoh.domisili.lat),
  domisili_longitude: String(profilContoh.domisili.lon),
  diperbarui_pada: DIPERBARUI,
  kompetensi_mahasiswa: kompetensiRows.map((k) => ({
    kompetensi_id: k.kompetensi_id,
    level_penguasaan: profilContoh.kompetensi[k.kode_kompetensi] ?? 0,
    kompetensi: { kode_kompetensi: k.kode_kompetensi },
  })),
};

function fakeRepository(overrides = {}) {
  const calls = { simpanHasil: [] };
  return {
    calls,
    findMahasiswa: async () => mahasiswa,
    findKompetensi: async () => kompetensiRows,
    findKriteria: async () => kriteriaRows(),
    findTempatDenganKebutuhan: async () => tempatRows,
    simpanHasil: async (mahasiswaId, items) => {
      calls.simpanHasil.push({ mahasiswaId, items });
      return items.map((it, i) => ({ tempatId: it.tempatId, cgaId: 100 + i, topsisId: 200 + i }));
    },
    ...overrides,
  };
}

const buatService = (overrides) => {
  const repository = fakeRepository(overrides);
  return { repository, service: createRekomendasiService({ repository, getConfig: () => CONFIG, now: () => NOW }) };
};

// --- dataset conversion

test('ubahKeDataset: database rows convert back to the dataset.json shape', () => {
  const { dataset: hasil } = ubahKeDataset({ tempatRows, kompetensiRows });
  assert.deepEqual(hasil.tempat, dataset.tempat);
  assert.deepEqual(
    hasil.kebutuhan.map(({ tempatId, kompetensiId, levelMinimum, jenis }) => ({ tempatId, kompetensiId, levelMinimum, jenis })),
    dataset.kebutuhan.map(({ tempatId, kompetensiId, levelMinimum, jenis }) => ({ tempatId, kompetensiId, levelMinimum, jenis }))
  );
  assert.deepEqual(hasil.kompetensi, dataset.kompetensi);
  // null stays null (the engine imputes), numbers are numbers, dates are ISO dates
  const t01 = hasil.tempat.find((t) => t.tempatId === 'T01');
  assert.equal(t01.benefitFinansial, null);
  assert.equal(t01.reputasi, null);
  assert.equal(typeof t01.lat, 'number');
  assert.equal(t01.tanggalAkses, '2026-11-05');
});

test('ubahKeProfilEngine: maps a mahasiswa row to the engine profile, C7 from the placeholder', () => {
  const profil = ubahKeProfilEngine(mahasiswa, CONFIG);
  assert.equal(profil.id, 'M1');
  assert.equal(profil.ipk, 3.45);
  assert.equal(profil.minatBidang, 'Web Development');
  assert.deepEqual(profil.domisili, { lat: 1.4748, lon: 124.8421 });
  assert.equal(profil.skorPengalamanSertifikasi, 4);
  assert.equal(Object.keys(profil.kompetensi).length, 21);
  assert.equal(profil.kompetensi.K01, 3);
  assert.equal(profil.kompetensi.K06, 0);
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

// --- the recommendation

test('hitungRekomendasi: the result equals the engine run on dataset.json (database is the same data)', async () => {
  const { service } = buatService();
  const hasil = await service.hitungRekomendasi(1);

  const langsung = recommend(
    { id: 'M1', ipk: 3.45, minatBidang: 'Web Development', domisili: { lat: 1.4748, lon: 124.8421 },
      skorPengalamanSertifikasi: 4, kompetensi: profilContoh.kompetensi },
    dataset
  );
  assert.equal(hasil.ranking.length, 15);
  assert.deepEqual(hasil.ranking.map((r) => [r.id, r.rank]), langsung.ranking.map((r) => [r.id, r.rank]));
  for (const [i, r] of hasil.ranking.entries()) {
    assert.ok(Math.abs(r.ci - langsung.ranking[i].ci) < 1e-12);
    assert.ok(Math.abs(r.values.C1 - langsung.ranking[i].values.C1) < 1e-12);
  }
  assert.deepEqual(hasil.ranking.slice(0, 3).map((r) => r.id), ['T05', 'T01', 'T04']);
});

test('hitungRekomendasi: the response follows the client contract (client/src/api/rekomendasi.js)', async () => {
  const { service } = buatService();
  const hasil = await service.hitungRekomendasi(1);

  for (const key of ['profilId', 'ranking', 'excluded', 'imputasi', 'warnings', 'steps', 'dihitungPada', 'profilDiperbaruiPada']) {
    assert.ok(key in hasil, `missing ${key}`);
  }
  assert.equal(hasil.profilId, 'M1');
  assert.equal(hasil.dihitungPada, NOW.toISOString());
  assert.equal(hasil.profilDiperbaruiPada, DIPERBARUI.toISOString());

  const [top] = hasil.ranking;
  for (const key of ['id', 'rank', 'ci', 'dPlus', 'dMinus', 'namaPerusahaan', 'posisi', 'bidang', 'lokasi',
    'sumberUrl', 'tanggalAkses', 'values', 'cga', 'flags', 'kesenjangan']) {
    assert.ok(key in top, `ranking item misses ${key}`);
  }
  assert.deepEqual(Object.keys(top.values), ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']);
  assert.equal(top.values.C7, 4);
  assert.ok(['NCF_NSF', 'WAJIB_SAJA'].includes(top.cga.aturan));
  for (const el of top.cga.perElement) {
    for (const key of ['id', 'nama', 'levelMahasiswa', 'levelKebutuhan', 'isMandatory', 'gap', 'weightScore']) {
      assert.ok(key in el, `perElement misses ${key}`);
    }
  }
  // names come from the kompetensi table
  const k01 = hasil.ranking.flatMap((r) => r.cga.perElement).find((e) => e.id === 'K01');
  assert.equal(k01.nama, 'Dasar Pemrograman');
  assert.ok(top.sumberUrl.startsWith('http'));
  assert.equal(top.flags.c6Imputasi, true);

  // excluded lowongan carry a name and posisi for the client
  assert.deepEqual(hasil.excluded.map((e) => e.tempatId).sort(), ['T02', 'T17']);
  assert.ok(hasil.excluded.every((e) => e.namaPerusahaan && e.posisi && e.alasan));

  // warnings are for the developer: the C7 placeholder and the unused NCF/NSF + pemetaan_bidang are stated
  assert.ok(hasil.warnings.some((w) => w.startsWith('C7')));
  assert.ok(hasil.warnings.some((w) => w.includes('pemetaan_bidang')));
  assert.ok(hasil.steps.decisionMatrix.length === 15);
});

test('hitungRekomendasi: persists every ranked lowongan in one call, mapped to primary keys', async () => {
  const { service, repository } = buatService();
  const hasil = await service.hitungRekomendasi(1);

  assert.equal(repository.calls.simpanHasil.length, 1);
  const { mahasiswaId, items } = repository.calls.simpanHasil[0];
  assert.equal(mahasiswaId, 1);
  assert.equal(items.length, hasil.ranking.length);

  const first = items[0];
  const idT05 = tempatRows.find((t) => t.kode_tempat === 'T05').tempat_id;
  assert.equal(first.tempatId, idT05);
  assert.equal(first.ranking, 1);
  assert.equal(first.compatibilityScore, hasil.ranking[0].values.C1);
  assert.equal(first.nilaiPreferensi, hasil.ranking[0].ci);
  for (const d of first.detail) {
    assert.ok(Number.isInteger(d.kompetensi_id));
    assert.ok(Number.isInteger(d.level_minimum));
    assert.equal(typeof d.is_mandatory, 'boolean');
  }
  // a level 0 answer is stored as 0, not as "unassessed"
  const nolPertama = items.flatMap((i) => i.detail).find((d) => d.level_mahasiswa === 0);
  assert.ok(nolPertama);
});

test('hitungRekomendasi: 404 for an unknown mahasiswa', async () => {
  const { service } = buatService({ findMahasiswa: async () => null });
  await assert.rejects(() => service.hitungRekomendasi(99), (e) => e.status === 404);
});

test('hitungRekomendasi: 422 lists what is missing, and nothing is persisted', async () => {
  const sebagian = {
    ...mahasiswa,
    domisili_latitude: null,
    kompetensi_mahasiswa: mahasiswa.kompetensi_mahasiswa.filter((km) => km.kompetensi.kode_kompetensi !== 'K05'),
  };
  const { service, repository } = buatService({ findMahasiswa: async () => sebagian });
  await assert.rejects(
    () => service.hitungRekomendasi(1),
    (e) =>
      e.status === 422 &&
      e.details.belum_diisi.length === 1 &&
      e.details.belum_diisi[0] === 'K05' &&
      e.details.data_kurang.includes('domisili')
  );
  assert.equal(repository.calls.simpanHasil.length, 0);
});

test('hitungRekomendasi: 422 for a minat bidang the engine does not know', async () => {
  const { service, repository } = buatService({ findMahasiswa: async () => ({ ...mahasiswa, minat_bidang: 'QA' }) });
  await assert.rejects(() => service.hitungRekomendasi(1), (e) => e.status === 422 && /bidang/i.test(e.message));
  assert.equal(repository.calls.simpanHasil.length, 0);
});

test('hitungRekomendasi: 422 and nothing persisted when kriteria_topsis weights do not sum to 1.0', async () => {
  const rows = kriteriaRows();
  rows[0].bobot = '0.5'; // the sum becomes 1.2
  const { service, repository } = buatService({ findKriteria: async () => rows });
  await assert.rejects(() => service.hitungRekomendasi(1), (e) => e.status === 422);
  assert.equal(repository.calls.simpanHasil.length, 0);
});

test('hitungRekomendasi: 422 with the excluded list when no lowongan can be ranked', async () => {
  const semuaDikeluarkan = tempatRows.map((t) => ({ ...t, status_alternatif: 'Dikeluarkan', alasan_dikeluarkan: 'uji' }));
  const { service, repository } = buatService({ findTempatDenganKebutuhan: async () => semuaDikeluarkan });
  await assert.rejects(
    () => service.hitungRekomendasi(1),
    (e) => e.status === 422 && e.details.excluded.length === 17
  );
  assert.equal(repository.calls.simpanHasil.length, 0);
});
