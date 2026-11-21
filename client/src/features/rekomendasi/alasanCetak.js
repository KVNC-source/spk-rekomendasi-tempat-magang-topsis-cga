/**
 * Why the "Cetak / Simpan PDF" button of the Pilihan page is off, or null when printing is allowed.
 * Pure (no imports), so `node --test` can run it.
 *
 * The summary prints the weights stored with the result. They are the weights used at calculation
 * time, so the printout is only right while the result is not stale: a result that is stale, or
 * whose freshness is unknown (no `basi` flag), cannot be printed.
 */
export const ALASAN_CETAK = {
  tanpaPilihan: "Belum ada pilihan yang bisa dicetak.",
  tanpaHasil: "Hitung rekomendasi dulu supaya ringkasan bisa dibuat.",
  basi: "Hitung ulang dulu supaya ringkasan sesuai data terbaru",
  tempatHilang: "Tempat ini tidak ada di hasil terbaru. Hitung ulang atau pilih tempat lain.",
  tanpaProfil: "Data dirimu belum terbaca. Muat ulang halaman ini.",
};

/**
 * @param {{ pilihan: object|null, hasil: object|null, item: object|null, profil: object|null }} state
 *   `item` is the pilihan's entry in `hasil.ranking`; `profil` is GET /api/mahasiswa/me/profil.
 */
export function alasanCetakNonaktif({ pilihan, hasil, item, profil }) {
  if (!pilihan) return ALASAN_CETAK.tanpaPilihan;
  if (!hasil) return ALASAN_CETAK.tanpaHasil;
  if (hasil.basi !== false) return ALASAN_CETAK.basi;
  if (!item) return ALASAN_CETAK.tempatHilang;
  if (!profil?.mahasiswa) return ALASAN_CETAK.tanpaProfil;
  return null;
}
