import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend } from '../src/engine/src/matrix.js';
import { ubahKeDataset } from '../src/services/dataset.js';
import {
  buatKriteriaEngine,
  createRekomendasiService,
  ubahKeProfilEngine,
} from '../src/services/rekomendasi.service.js';
import { HttpError } from '../src/lib/httpError.js';
import { ambilKonfigEngine } from '../src/lib/sidikJari.js';
import { MAHASISWA, cookie, withApp } from './helpers.js';

import {
  DIPERBARUI,
  NOW,
  dataset,
  kompetensiRows,
  kriteriaRows,
  mahasiswa,
  profilContoh,
  tempatRows,
} from './fixtures-db.js';

/**
 * An in-memory repository. `state` holds what the "database" contains; a test changes it
 * (state.mahasiswa = ..., state.kriteria[0].bobot = ...) to simulate the profile or the
 * Administrator changing something after a calculation.
 */
function fakeRepository(overrides = {}) {
  const calls = { simpanHasil: [] };
  const state = {
    mahasiswa,
    kompetensi: kompetensiRows,
    kriteria: kriteriaRows(),
    tempat: tempatRows,
    tersimpan: null, // the hasil_rekomendasi row, as Prisma returns it
  };
  return {
    calls,
    state,
    findMahasiswa: async () => state.mahasiswa,
    findKompetensi: async () => state.kompetensi,
    findKriteria: async () => state.kriteria,
    findTempatDenganKebutuhan: async () => state.tempat,
    simpanHasil: async (mahasiswaId, items, snapshot) => {
      calls.simpanHasil.push({ mahasiswaId, items, snapshot });
      state.tersimpan = {
        mahasiswa_id: mahasiswaId,
        hasil: snapshot.hasil,
        dihitung_pada: new Date(snapshot.dihitungPada),
        profil_diperbarui_pada: new Date(snapshot.profilDiperbaruiPada),
        sidik_profil: snapshot.sidikProfil,
        sidik_data: snapshot.sidikData,
      };
      return items.map((it, i) => ({ tempatId: it.tempatId, cgaId: 100 + i, topsisId: 200 + i }));
    },
    findHasilTerakhir: async () => state.tersimpan,
    ...overrides,
  };
}

const buatService = (overrides, opsi = {}) => {
  const repository = fakeRepository(overrides);
  return { repository, service: createRekomendasiService({ repository, now: () => NOW, ...opsi }) };
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

test('ubahKeProfilEngine: maps a mahasiswa row to the engine profile, C7 from the two counts', () => {
  const profil = ubahKeProfilEngine(mahasiswa);
  assert.equal(profil.id, 'M1');
  assert.equal(profil.ipk, 3.45);
  assert.equal(profil.minatBidang, 'Web Development');
  assert.deepEqual(profil.domisili, { lat: 1.4748, lon: 124.8421 });
  assert.equal(profil.skorPengalamanSertifikasi, 4);
  assert.equal(Object.keys(profil.kompetensi).length, 21);
  assert.equal(profil.kompetensi.K01, 3);
  assert.equal(profil.kompetensi.K06, 0);

  // C7 comes from the counts by the one formula in lib/skorPengalaman.js (1 point each for now)
  assert.equal(ubahKeProfilEngine({ ...mahasiswa, jumlah_proyek: 3, jumlah_sertifikasi: 1 }).skorPengalamanSertifikasi, 4);
  assert.equal(ubahKeProfilEngine({ ...mahasiswa, jumlah_proyek: 0, jumlah_sertifikasi: 0 }).skorPengalamanSertifikasi, 0);
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

test('hitungRekomendasi: 422 lists the missing data fields, and nothing is persisted', async () => {
  const tanpaDomisili = { ...mahasiswa, domisili_latitude: null };
  const { service, repository } = buatService({ findMahasiswa: async () => tanpaDomisili });
  await assert.rejects(
    () => service.hitungRekomendasi(1),
    (e) => e.status === 422 && e.details.data_kurang.includes('domisili')
  );
  assert.equal(repository.calls.simpanHasil.length, 0);
});

test('hitungRekomendasi: an unanswered kompetensi does not block; it counts as level 0 (Belum punya)', async () => {
  // K05 has no answer (as if the Administrator had just added it)
  const sebagian = {
    ...mahasiswa,
    kompetensi_mahasiswa: mahasiswa.kompetensi_mahasiswa.filter((km) => km.kompetensi.kode_kompetensi !== 'K05'),
  };
  const lengkap = await buatService().service.hitungRekomendasi(1);
  const { service, repository } = buatService({ findMahasiswa: async () => sebagian });
  const hasil = await service.hitungRekomendasi(1);

  assert.equal(hasil.ranking.length, 15);
  assert.equal(repository.calls.simpanHasil.length, 1); // it was calculated and stored
  const el = hasil.ranking.flatMap((r) => r.cga.perElement).find((e) => e.id === 'K05');
  assert.equal(el.levelMahasiswa, 0);

  // the sample profile answers K05 with level 2, so counting it as 0 must change the result
  const k05Lengkap = lengkap.ranking.flatMap((r) => r.cga.perElement).find((e) => e.id === 'K05');
  assert.equal(k05Lengkap.levelMahasiswa, 2);
  const naik = (r, id) => r.cga.perElement.find((e) => e.id === id)?.weightScore;
  const rLengkap = lengkap.ranking.find((r) => r.cga.perElement.some((e) => e.id === 'K05'));
  const rSebagian = hasil.ranking.find((r) => r.id === rLengkap.id);
  assert.ok(naik(rSebagian, 'K05') < naik(rLengkap, 'K05'));
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

// --- Tahap 5: the profile fields behind C7, the latest result, and the stale flag

test('hitungRekomendasi: 422 also lists kota and the two counts when they are missing, and nothing is persisted', async () => {
  const tanpaIsian = { ...mahasiswa, kota_domisili: null, jumlah_proyek: null, jumlah_sertifikasi: null };
  const { service, repository } = buatService({ findMahasiswa: async () => tanpaIsian });
  await assert.rejects(
    () => service.hitungRekomendasi(1),
    (e) =>
      e.status === 422 &&
      ['domisili', 'jumlah_proyek', 'jumlah_sertifikasi'].every((f) => e.details.data_kurang.includes(f)) &&
      e.details.belum_diisi.length === 0
  );
  assert.equal(repository.calls.simpanHasil.length, 0);
  assert.equal(repository.state.tersimpan, null);
});

test('hitungRekomendasi: the C7 value the engine sees comes from the two counts', async () => {
  const { service } = buatService();
  const biasa = await service.hitungRekomendasi(1); // 2 + 2
  assert.ok(biasa.ranking.every((r) => r.values.C7 === 4));
  const { service: lain } = buatService({ findMahasiswa: async () => ({ ...mahasiswa, jumlah_proyek: 5, jumlah_sertifikasi: 0 }) });
  assert.ok((await lain.hitungRekomendasi(1)).ranking.every((r) => r.values.C7 === 5));
});

test('hitungRekomendasi: stores the whole result and its two fingerprints in the same call as the rows', async () => {
  const { service, repository } = buatService();
  const hasil = await service.hitungRekomendasi(1);
  const { snapshot } = repository.calls.simpanHasil[0];
  assert.match(snapshot.sidikProfil, /^[0-9a-f]{64}$/);
  assert.match(snapshot.sidikData, /^[0-9a-f]{64}$/);
  assert.equal(snapshot.dihitungPada, NOW.toISOString());
  assert.equal(snapshot.profilDiperbaruiPada, DIPERBARUI.toISOString());
  assert.equal(snapshot.hasil.ranking.length, hasil.ranking.length);
  assert.equal(hasil.basi, false);
  assert.deepEqual(hasil.penyebabBasi, []);
});

test('ambilTerakhir: 404 with a clear message when nothing was calculated yet', async () => {
  const { service } = buatService();
  await assert.rejects(
    () => service.ambilTerakhir(1),
    (e) => e.status === 404 && /belum ada hasil/i.test(e.message)
  );
});

test('ambilTerakhir: returns the result exactly as POST returned it (C1, gaps per element, excluded...), not stale', async () => {
  const { service } = buatService();
  const dariPost = JSON.parse(JSON.stringify(await service.hitungRekomendasi(1)));
  const terakhir = JSON.parse(JSON.stringify(await service.ambilTerakhir(1)));
  assert.deepEqual(terakhir, dariPost);
  assert.equal(terakhir.basi, false);
  assert.ok(terakhir.ranking[0].values.C1 > 0);
  assert.ok(terakhir.ranking.some((r) => r.kesenjangan.length > 0 && r.kesenjangan[0].nama));
  assert.ok(Array.isArray(terakhir.excluded));
});

test('ambilTerakhir: looks only at the mahasiswa it is asked for', async () => {
  const diminta = [];
  const { service } = buatService({
    findHasilTerakhir: async (id) => {
      diminta.push(['hasil', id]);
      return null;
    },
  });
  await assert.rejects(() => service.ambilTerakhir(42), (e) => e.status === 404);
  assert.deepEqual(diminta, [['hasil', 42]]);
});

/** Calculates once, then lets the test change the "database" and read the result again. */
async function hitungLaluUbah(ubah, opsi) {
  const { service, repository } = buatService(undefined, opsi);
  await service.hitungRekomendasi(1);
  ubah(repository.state);
  return service.ambilTerakhir(1);
}

test('stale: nothing changed, or the same profile saved again with a new diperbarui_pada, is not stale', async () => {
  const sama = await hitungLaluUbah(() => {});
  assert.equal(sama.basi, false);
  assert.deepEqual(sama.penyebabBasi, []);

  const disimpanUlang = await hitungLaluUbah((s) => {
    s.mahasiswa = { ...s.mahasiswa, diperbarui_pada: new Date('2026-11-18T00:00:00Z'), ipk: '3.45' };
  });
  assert.equal(disimpanUlang.basi, false);
});

test('stale (a) profile: a changed IPK, minat, kota, count or level marks it stale with cause "profil"', async () => {
  const ubahan = [
    (s) => (s.mahasiswa = { ...s.mahasiswa, ipk: '3.80' }),
    (s) => (s.mahasiswa = { ...s.mahasiswa, minat_bidang: 'Data Science' }),
    (s) => (s.mahasiswa = { ...s.mahasiswa, domisili_latitude: '-6.2615', domisili_longitude: '106.8106', kota_domisili: 'Jakarta Selatan' }),
    (s) => (s.mahasiswa = { ...s.mahasiswa, jumlah_proyek: 9 }),
    (s) =>
      (s.mahasiswa = {
        ...s.mahasiswa,
        kompetensi_mahasiswa: s.mahasiswa.kompetensi_mahasiswa.map((km) => (km.kompetensi.kode_kompetensi === 'K01' ? { ...km, level_penguasaan: 1 } : km)),
      }),
  ];
  for (const [i, ubah] of ubahan.entries()) {
    const hasil = await hitungLaluUbah(ubah);
    assert.equal(hasil.basi, true, `profile change #${i}`);
    assert.deepEqual(hasil.penyebabBasi, ['profil'], `profile change #${i}`);
  }
});

test('stale (b) data: a changed weight, tempat magang, kebutuhan kompetensi or kompetensi name marks it stale with cause "data"', async () => {
  const ubahan = {
    'kriteria weight': (s) => (s.kriteria = s.kriteria.map((k) => (k.kode_kriteria === 'C4' ? { ...k, bobot: '0.3100' } : k))),
    'tempat field': (s) => (s.tempat = s.tempat.map((t) => (t.kode_tempat === 'T05' ? { ...t, nama_perusahaan: 'Nama baru' } : t))),
    'tempat deleted': (s) => (s.tempat = s.tempat.filter((t) => t.kode_tempat !== 'T05')),
    'kebutuhan level': (s) =>
      (s.tempat = s.tempat.map((t) =>
        t.kode_tempat === 'T05'
          ? { ...t, kebutuhan_kompetensi: t.kebutuhan_kompetensi.map((k, i) => (i === 0 ? { ...k, level_minimum: k.level_minimum + 1 } : k)) }
          : t
      )),
    'kompetensi name': (s) => (s.kompetensi = s.kompetensi.map((k) => (k.kode_kompetensi === 'K01' ? { ...k, nama_kompetensi: 'Lain' } : k))),
  };
  for (const [nama, ubah] of Object.entries(ubahan)) {
    const hasil = await hitungLaluUbah(ubah);
    assert.equal(hasil.basi, true, nama);
    assert.deepEqual(hasil.penyebabBasi, ['data'], nama);
  }
});

test('stale: both causes at once list both', async () => {
  const hasil = await hitungLaluUbah((s) => {
    s.mahasiswa = { ...s.mahasiswa, ipk: '3.10' };
    s.kriteria = s.kriteria.map((k) => (k.kode_kriteria === 'C1' ? { ...k, bobot: '0.2500' } : k));
  });
  assert.equal(hasil.basi, true);
  assert.deepEqual(hasil.penyebabBasi, ['profil', 'data']);
});

test('stale: a change to the engine config (the C2 table, still awaiting the dosen) makes an old result stale', async () => {
  const k = ambilKonfigEngine();
  const repository = fakeRepository();
  const dihitung = createRekomendasiService({ repository, now: () => NOW });
  await dihitung.hitungRekomendasi(1);
  assert.equal((await dihitung.ambilTerakhir(1)).basi, false);

  // the same database, but config.js now says serumpun = 60 instead of 50
  const sesudah = createRekomendasiService({
    repository,
    now: () => NOW,
    getKonfigEngine: () => ({ ...k, c2: { ...k.c2, serumpun: 60 } }),
  });
  const hasil = await sesudah.ambilTerakhir(1);
  assert.equal(hasil.basi, true);
  assert.deepEqual(hasil.penyebabBasi, ['data']);
});

test('stale: calculating again replaces the stored result and clears the flag', async () => {
  const { service, repository } = buatService();
  await service.hitungRekomendasi(1);
  repository.state.kriteria = repository.state.kriteria.map((k) => (k.kode_kriteria === 'C4' ? { ...k, bobot: '0.3000' } : k));
  repository.state.kriteria = repository.state.kriteria.map((k) => (k.kode_kriteria === 'C2' ? { ...k, bobot: '0.0000' } : k)); // still sums to 1
  assert.equal((await service.ambilTerakhir(1)).basi, true);

  const baru = await service.hitungRekomendasi(1);
  assert.equal(baru.basi, false);
  assert.equal(repository.calls.simpanHasil.length, 2);
  const sesudah = await service.ambilTerakhir(1);
  assert.equal(sesudah.basi, false);
  assert.deepEqual(sesudah.ranking.map((r) => r.id), baru.ranking.map((r) => r.id)); // the new ranking is what is stored
});

// --- HTTP: GET /api/rekomendasi/terakhir

test('GET /api/rekomendasi/terakhir: 401 without a session, 403 for the administrator, service not called', async () => {
  const rekomendasiService = { ambilTerakhir: async () => assert.fail('must not be called') };
  await withApp({ rekomendasiService }, async (base) => {
    assert.equal((await fetch(`${base}/api/rekomendasi/terakhir`)).status, 401);
    assert.equal((await fetch(`${base}/api/rekomendasi/terakhir`, { headers: cookie('tok-admin') })).status, 403);
  });
});

test('GET /api/rekomendasi/terakhir: 200 with the result for the signed-in mahasiswa only; the query cannot pick another', async () => {
  const diminta = [];
  const rekomendasiService = {
    ambilTerakhir: async (id) => {
      diminta.push(id);
      return { ranking: [], basi: false, penyebabBasi: [] };
    },
  };
  await withApp({ rekomendasiService }, async (base) => {
    const res = await fetch(`${base}/api/rekomendasi/terakhir?mahasiswa_id=999`, { headers: cookie('tok-mhs') });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ranking: [], basi: false, penyebabBasi: [] });
  });
  assert.deepEqual(diminta, [MAHASISWA.mahasiswa_id]);
});

test('GET /api/rekomendasi/terakhir: the empty state is a 404 with a message', async () => {
  const { service } = buatService();
  await withApp({ rekomendasiService: service }, async (base) => {
    // the app's mahasiswa (id 7) has no result; the fake repository answers for any id
    const res = await fetch(`${base}/api/rekomendasi/terakhir`, { headers: cookie('tok-mhs') });
    assert.equal(res.status, 404);
    assert.match((await res.json()).error, /belum ada hasil/i);
  });
});
