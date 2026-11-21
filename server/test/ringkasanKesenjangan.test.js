import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  JUMLAH_REKOMENDASI_TERATAS,
  keteranganKekurangan,
  ringkasKesenjangan,
} from '../src/lib/ringkasanKesenjangan.js';
import { recommend } from '../src/engine/src/matrix.js';
import { createRekomendasiService } from '../src/services/rekomendasi.service.js';
import { MAHASISWA, cookie, withApp } from './helpers.js';
import { NOW, dataset, kompetensiRows, kriteriaRows, mahasiswa, profilContoh, tempatRows } from './fixtures-db.js';

/** One shortfall as the engine reports it in `kesenjangan`: gap = level - required, capped at +1. */
const kurang = (id, levelMhs, levelButuh, wajib = true) => ({
  id,
  nama: `Nama ${id}`,
  levelMahasiswa: levelMhs,
  levelKebutuhan: levelButuh,
  isMandatory: wajib,
  gap: levelMhs - levelButuh,
});
const lowongan = (rank, ...gaps) => ({ id: `T${rank}`, rank, kesenjangan: gaps });
const cari = (ringkasan, id) => ringkasan.kompetensiPrioritas.find((k) => k.id === id);

test('the number of lowongan looked at is a constant: 5', () => {
  assert.equal(JUMLAH_REKOMENDASI_TERATAS, 5);
});

test('counts in how many of the top lowongan a kompetensi falls short, and in how many it is wajib', () => {
  const ranking = [
    lowongan(1, kurang('K01', 1, 3, true), kurang('K02', 0, 2, false)),
    lowongan(2, kurang('K01', 1, 2, true), kurang('K02', 0, 1, false)),
    lowongan(3, kurang('K01', 1, 4, false)),
    lowongan(4),
    lowongan(5, kurang('K03', 2, 3, true)),
  ];
  const r = ringkasKesenjangan(ranking);
  assert.equal(r.jumlahDiperiksa, 5);
  const k01 = cari(r, 'K01');
  assert.deepEqual(
    [k01.jumlahKurang, k01.jumlahWajib, k01.levelMahasiswa, k01.levelDibutuhkan, k01.kesenjanganTerbesar],
    [3, 2, 1, 4, 3] // short in 3 lowongan, wajib in 2; the highest requirement is 4; the biggest shortfall is 4-1 = 3
  );
  const k02 = cari(r, 'K02');
  assert.deepEqual([k02.jumlahKurang, k02.jumlahWajib, k02.levelDibutuhkan], [2, 0, 2]);
  assert.equal(k01.nama, 'Nama K01');
});

test('order: most lowongan first, then wajib first, then the biggest shortfall, then the code', () => {
  const ranking = [
    lowongan(1, kurang('K05', 0, 2, true), kurang('K04', 1, 2, false), kurang('K03', 1, 4, false), kurang('K02', 1, 2, false), kurang('K09', 1, 3, true)),
    lowongan(2, kurang('K05', 0, 2, true), kurang('K04', 1, 2, false), kurang('K03', 1, 4, false), kurang('K02', 1, 2, false)),
    lowongan(3, kurang('K08', 1, 3, true)),
  ];
  const urutan = ringkasKesenjangan(ranking).kompetensiPrioritas.map((k) => k.id);
  // 2 lowongan each: K05 (wajib 2) first; then K03 (not wajib, shortfall 3) before K04 and K02 (shortfall 1);
  // K02 before K04 on the code. Then the single-lowongan ones: K09 and K08 are wajib (shortfall 2 each): K08 < K09 on the code.
  assert.deepEqual(urutan, ['K05', 'K03', 'K02', 'K04', 'K08', 'K09']);
});

test('the wajib count breaks a tie in the number of lowongan, before the size of the shortfall', () => {
  const ranking = [
    lowongan(1, kurang('K01', 0, 4, false), kurang('K02', 2, 3, true)),
    lowongan(2, kurang('K01', 0, 4, false), kurang('K02', 2, 3, true)),
  ];
  // both short in 2 lowongan; K01 has the bigger shortfall (4) but K02 is wajib: K02 first
  assert.deepEqual(ringkasKesenjangan(ranking).kompetensiPrioritas.map((k) => k.id), ['K02', 'K01']);
});

test('a kompetensi that already meets the requirement does not take part', () => {
  const sesuai = { id: 'K07', nama: 'Sudah sesuai', levelMahasiswa: 3, levelKebutuhan: 2, isMandatory: true, gap: 1 };
  const pas = { id: 'K08', nama: 'Pas', levelMahasiswa: 2, levelKebutuhan: 2, isMandatory: true, gap: 0 };
  const r = ringkasKesenjangan([lowongan(1, kurang('K01', 0, 2), sesuai, pas), lowongan(2, sesuai)]);
  assert.deepEqual(r.kompetensiPrioritas.map((k) => k.id), ['K01']);
});

test('level 0 "Belum punya" counts as falling short', () => {
  const r = ringkasKesenjangan([lowongan(1, kurang('K06', 0, 1, true))]);
  const k06 = cari(r, 'K06');
  assert.equal(k06.levelMahasiswa, 0);
  assert.equal(k06.jumlahKurang, 1);
  assert.equal(k06.kesenjanganTerbesar, 1);
});

test('only the 5 best-ranked lowongan are looked at, whatever order the array comes in', () => {
  const ranking = [
    lowongan(6, kurang('K09', 0, 4)),
    lowongan(1, kurang('K01', 0, 2)),
    lowongan(2),
    lowongan(7, kurang('K09', 0, 4)),
    lowongan(3),
    lowongan(4),
    lowongan(5),
  ];
  const r = ringkasKesenjangan(ranking);
  assert.equal(r.jumlahDiperiksa, 5);
  assert.deepEqual(r.kompetensiPrioritas.map((k) => k.id), ['K01']); // K09 sits only in ranks 6 and 7
  assert.equal(ringkasKesenjangan(ranking, { jumlahTeratas: 7 }).kompetensiPrioritas.length, 2);
});

test('fewer than 5 lowongan: the actual number is used, in the numbers and in the text', () => {
  const ranking = [lowongan(1, kurang('K01', 1, 3, true)), lowongan(2, kurang('K01', 1, 2, false)), lowongan(3)];
  const r = ringkasKesenjangan(ranking);
  assert.equal(r.jumlahDiperiksa, 3);
  assert.equal(r.kompetensiPrioritas[0].keterangan, 'kurang di 2 dari 3 rekomendasi teratas (1 di antaranya wajib)');
});

test('an empty ranking, or one with nothing short, gives an empty list in the same shape', () => {
  assert.deepEqual(ringkasKesenjangan([]), { jumlahDiperiksa: 0, kompetensiPrioritas: [] });
  assert.deepEqual(ringkasKesenjangan(undefined), { jumlahDiperiksa: 0, kompetensiPrioritas: [] });
  assert.deepEqual(ringkasKesenjangan([lowongan(1), lowongan(2)]), { jumlahDiperiksa: 2, kompetensiPrioritas: [] });
});

test('keterangan: the example wording and its variants', () => {
  assert.equal(keteranganKekurangan({ jumlahKurang: 3, jumlahWajib: 2 }, 5), 'kurang di 3 dari 5 rekomendasi teratas (2 di antaranya wajib)');
  assert.equal(keteranganKekurangan({ jumlahKurang: 3, jumlahWajib: 3 }, 5), 'kurang di 3 dari 5 rekomendasi teratas (semuanya wajib)');
  assert.equal(keteranganKekurangan({ jumlahKurang: 1, jumlahWajib: 1 }, 5), 'kurang di 1 dari 5 rekomendasi teratas (wajib)');
  assert.equal(keteranganKekurangan({ jumlahKurang: 1, jumlahWajib: 0 }, 5), 'kurang di 1 dari 5 rekomendasi teratas');
  assert.equal(keteranganKekurangan({ jumlahKurang: 4, jumlahWajib: 0 }, 5), 'kurang di 4 dari 5 rekomendasi teratas');
});

test('it never changes its input: the ranking array and its items stay exactly as they were', () => {
  const ranking = [lowongan(2, kurang('K01', 1, 3)), lowongan(1, kurang('K02', 0, 2))];
  const sebelum = structuredClone(ranking);
  const beku = (x) => (Object.values(x).forEach((v) => v && typeof v === 'object' && beku(v)), Object.freeze(x));
  beku(ranking);
  assert.doesNotThrow(() => ringkasKesenjangan(ranking));
  assert.deepEqual(ranking, sebelum);
  assert.deepEqual(ranking.map((l) => l.rank), [2, 1]); // not re-sorted in place
});

// --- on real engine output

test('on a real result every count matches an independent recount of the top 5', () => {
  const hasil = recommend(
    { id: 'M1', ipk: 3.45, minatBidang: 'Web Development', domisili: { lat: 1.4748, lon: 124.8421 }, skorPengalamanSertifikasi: 4, kompetensi: profilContoh.kompetensi },
    dataset
  );
  const r = ringkasKesenjangan(hasil.ranking);
  assert.equal(r.jumlahDiperiksa, 5);

  const tunggu = new Map();
  for (const item of hasil.ranking.slice(0, 5)) {
    for (const e of item.cga.perElement) {
      if (e.levelMahasiswa !== null && e.levelMahasiswa < e.levelKebutuhan) {
        const t = tunggu.get(e.id) ?? { kurang: 0, wajib: 0 };
        t.kurang += 1;
        if (e.isMandatory) t.wajib += 1;
        tunggu.set(e.id, t);
      }
    }
  }
  assert.equal(r.kompetensiPrioritas.length, tunggu.size);
  for (const k of r.kompetensiPrioritas) {
    assert.deepEqual([k.jumlahKurang, k.jumlahWajib], [tunggu.get(k.id).kurang, tunggu.get(k.id).wajib], k.id);
    assert.ok(k.levelMahasiswa < k.levelDibutuhkan);
  }
  // sorted as promised
  for (let i = 1; i < r.kompetensiPrioritas.length; i += 1) {
    const [a, b] = [r.kompetensiPrioritas[i - 1], r.kompetensiPrioritas[i]];
    assert.ok(a.jumlahKurang > b.jumlahKurang || (a.jumlahKurang === b.jumlahKurang && a.jumlahWajib >= b.jumlahWajib));
  }
});

// --- in the responses

function fakeRepository() {
  const state = { tersimpan: null };
  return {
    findMahasiswa: async () => mahasiswa,
    findKompetensi: async () => kompetensiRows,
    findKriteria: async () => kriteriaRows(),
    findTempatDenganKebutuhan: async () => tempatRows,
    simpanHasil: async (id, items, snapshot) => {
      state.tersimpan = {
        mahasiswa_id: id,
        hasil: snapshot.hasil,
        sidik_profil: snapshot.sidikProfil,
        sidik_data: snapshot.sidikData,
      };
      return [];
    },
    findHasilTerakhir: async () => state.tersimpan,
    state,
  };
}
const buat = () => {
  const repository = fakeRepository();
  return { repository, service: createRekomendasiService({ repository, now: () => NOW }) };
};

test('POST and GET /terakhir both carry ringkasanKesenjangan, in exactly the same shape and content', async () => {
  const { service, repository } = buat();
  const dariPost = JSON.parse(JSON.stringify(await service.hitungRekomendasi(1)));
  const dariTerakhir = JSON.parse(JSON.stringify(await service.ambilTerakhir(1)));

  assert.deepEqual(Object.keys(dariPost).sort(), Object.keys(dariTerakhir).sort());
  assert.deepEqual(dariPost.ringkasanKesenjangan, dariTerakhir.ringkasanKesenjangan);
  assert.deepEqual(dariPost, dariTerakhir);
  assert.equal(dariPost.ringkasanKesenjangan.jumlahDiperiksa, 5);
  assert.ok(Array.isArray(dariPost.ringkasanKesenjangan.kompetensiPrioritas));
  // computed from the ranking, never stored with the result
  assert.equal('ringkasanKesenjangan' in repository.state.tersimpan.hasil, false);
});

test('a result stored before this field existed still gets it on GET /terakhir', async () => {
  const { service, repository } = buat();
  await service.hitungRekomendasi(1);
  assert.equal('ringkasanKesenjangan' in repository.state.tersimpan.hasil, false);
  const terakhir = await service.ambilTerakhir(1);
  assert.equal(terakhir.ringkasanKesenjangan.jumlahDiperiksa, 5);
});

test('the summary changes nothing: C1, Ci and the order are exactly what the engine returns', async () => {
  const { service } = buat();
  const hasil = await service.hitungRekomendasi(1);
  const langsung = recommend(
    { id: 'M1', ipk: 3.45, minatBidang: 'Web Development', domisili: { lat: 1.4748, lon: 124.8421 }, skorPengalamanSertifikasi: 4, kompetensi: profilContoh.kompetensi },
    dataset
  );
  assert.deepEqual(hasil.ranking.map((r) => [r.id, r.rank]), langsung.ranking.map((r) => [r.id, r.rank]));
  for (const [i, r] of hasil.ranking.entries()) {
    assert.equal(r.values.C1, langsung.ranking[i].values.C1);
    assert.equal(r.ci, langsung.ranking[i].ci);
    assert.deepEqual(r.kesenjangan, langsung.ranking[i].kesenjangan);
  }
  assert.deepEqual(hasil.ranking.slice(0, 3).map((r) => r.id), ['T05', 'T01', 'T04']);
});

test('GET /api/rekomendasi/terakhir over HTTP returns the summary too', async () => {
  const { service } = buat();
  await service.hitungRekomendasi(7); // the fake repository answers for any id
  await withApp({ rekomendasiService: service }, async (base) => {
    const res = await fetch(`${base}/api/rekomendasi/terakhir`, { headers: cookie('tok-mhs') });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ringkasanKesenjangan.jumlahDiperiksa, 5);
    assert.equal(typeof body.ringkasanKesenjangan.kompetensiPrioritas[0]?.keterangan ?? 'kosong', 'string');
    assert.equal(MAHASISWA.mahasiswa_id, 7);
  });
});
