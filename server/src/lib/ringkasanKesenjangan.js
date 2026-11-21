/**
 * Kompetensi prioritas: which kompetensi the mahasiswa should work on first.
 *
 * It looks at the top JUMLAH_REKOMENDASI_TERATAS lowongan of a result and, for
 * every kompetensi whose level is below the requirement in one of them (level 0
 * "Belum punya" included), counts in how many of those lowongan it falls short
 * and in how many it is wajib. Purely descriptive: it reads `ranking`, never
 * changes it, and has no influence on C1, Ci or the order of the recommendation.
 *
 * ONE source for everybody: the server puts the result in POST /api/rekomendasi
 * and GET /api/rekomendasi/terakhir (computed from `ranking` every time, not
 * stored), and the client mock imports this very file (like skorPengalaman.js).
 * It has no imports, so it runs unchanged in Node and in the browser build.
 *
 * Input: `ranking` as the engine returns it; each item has `rank` and
 * `kesenjangan: [{ id, nama, levelMahasiswa, levelKebutuhan, isMandatory, gap }]`
 * (the elements with gap < 0).
 */
export const JUMLAH_REKOMENDASI_TERATAS = 5;

/** "kurang di 3 dari 5 rekomendasi teratas (2 di antaranya wajib)" */
export function keteranganKekurangan({ jumlahKurang, jumlahWajib }, jumlahDiperiksa) {
  const dasar = `kurang di ${jumlahKurang} dari ${jumlahDiperiksa} rekomendasi teratas`;
  if (jumlahWajib <= 0) return dasar;
  if (jumlahKurang === 1) return `${dasar} (wajib)`;
  if (jumlahWajib === jumlahKurang) return `${dasar} (semuanya wajib)`;
  return `${dasar} (${jumlahWajib} di antaranya wajib)`;
}

/**
 * @param {object[]} ranking
 * @param {{ jumlahTeratas?: number }} [opsi]
 * @returns {{ jumlahDiperiksa: number, kompetensiPrioritas: Array<{
 *   id: string, nama: string, levelMahasiswa: number, levelDibutuhkan: number,
 *   jumlahKurang: number, jumlahWajib: number, kesenjanganTerbesar: number, keterangan: string }> }}
 */
export function ringkasKesenjangan(ranking, { jumlahTeratas = JUMLAH_REKOMENDASI_TERATAS } = {}) {
  // a sorted COPY: the caller's array and its items are never modified
  const teratas = [...(ranking ?? [])].sort((a, b) => a.rank - b.rank).slice(0, jumlahTeratas);

  const peta = new Map();
  for (const lowongan of teratas) {
    for (const e of lowongan.kesenjangan ?? []) {
      if (!(e.gap < 0)) continue; // only a level below the requirement counts
      const sekarang = peta.get(e.id) ?? {
        id: e.id,
        nama: e.nama ?? e.id,
        levelMahasiswa: e.levelMahasiswa,
        levelDibutuhkan: e.levelKebutuhan,
        jumlahKurang: 0,
        jumlahWajib: 0,
        kesenjanganTerbesar: 0,
      };
      sekarang.jumlahKurang += 1;
      if (e.isMandatory) sekarang.jumlahWajib += 1;
      sekarang.levelDibutuhkan = Math.max(sekarang.levelDibutuhkan, e.levelKebutuhan);
      sekarang.kesenjanganTerbesar = Math.max(sekarang.kesenjanganTerbesar, -e.gap);
      peta.set(e.id, sekarang);
    }
  }

  const jumlahDiperiksa = teratas.length;
  // most lowongan first, then wajib first, then the biggest shortfall; the code makes ties stable
  const kompetensiPrioritas = [...peta.values()]
    .sort(
      (a, b) =>
        b.jumlahKurang - a.jumlahKurang ||
        b.jumlahWajib - a.jumlahWajib ||
        b.kesenjanganTerbesar - a.kesenjanganTerbesar ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    )
    .map((k) => ({ ...k, keterangan: keteranganKekurangan(k, jumlahDiperiksa) }));

  return { jumlahDiperiksa, kompetensiPrioritas };
}
