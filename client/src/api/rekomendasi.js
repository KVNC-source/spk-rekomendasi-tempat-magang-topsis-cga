/**
 * Rekomendasi API.
 *
 * CONTRACT (not on the server yet; mocked in ./mock, which runs a copy of the
 * spk-engine). The response IS the engine's recommend() output:
 *
 *   POST /api/rekomendasi      body {} — the server uses the signed-in
 *                              mahasiswa's saved profile
 *        -> 200 {
 *             profilId,
 *             ranking: [{ id, rank, ci, dPlus, dMinus,
 *                         namaPerusahaan, posisi, bidang, lokasi,
 *                         sumberUrl, tanggalAkses,   // original job posting + date accessed
 *                         values: { C1..C7 },
 *                         cga: { compatibilityScore, aturan: "NCF_NSF"|"WAJIB_SAJA",
 *                                sKomp, avgWajib, avgOpsional, ncf, nsf, sMaks,
 *                                perElement: [{ id, nama, levelMahasiswa, levelKebutuhan,
 *                                               isMandatory, gap, weightScore }] },
 *                         flags: { c5Imputasi, c6Imputasi },
 *                         kesenjangan: [same element shape] }],  // gap < 0, largest first
 *             (spk-engine 0.3.0 already returns nama / levelMahasiswa / levelKebutuhan
 *              in perElement and kesenjangan, and sumberUrl / tanggalAkses per item)
 *             excluded: [{ tempatId, alasan, namaPerusahaan?, posisi? }],
 *             imputasi, warnings: [string], steps,
 *             dihitungPada: ISO date, profilDiperbaruiPada: ISO date }
 *        -> 422 { error, belum_diisi: [kompetensi_id], data_kurang: [field] }
 *           when the profile is incomplete
 *
 *   GET  /api/rekomendasi/terakhir
 *        -> 200, same shape as above, or 404 { error } if none was calculated yet
 *
 * Shown to the mahasiswa: rank, C1 as a percentage, gaps (named via
 * /api/kompetensi), an "estimate" tag when c5Imputasi/c6Imputasi is true.
 * Never shown to the mahasiswa: warnings, steps (admin / Bab IV only), and Ci
 * is never shown as a percentage (it is relative to the other lowongan).
 *
 * ASK for the server: names in `excluded`.
 */
import { ApiError, apiFetch } from "./http";
import { loadMock, useMock } from "./profil";
import { MAHASISWA_ID } from "./session";

export const requestRekomendasi = () =>
  useMock ? loadMock().then((m) => m.postRekomendasi()) : apiFetch("/api/rekomendasi", { method: "POST", body: {} });

/** Resolves to the last result, or null when none exists yet. */
export async function getRekomendasiTerakhir() {
  try {
    return useMock
      ? await loadMock().then((m) => m.getRekomendasiTerakhir())
      : await apiFetch("/api/rekomendasi/terakhir");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Pilihan: the lowongan the mahasiswa saves as their own choice. The
 * koordinator is not a system user and approval happens outside the system
 * (Batasan 6), so there is no submission flow and no status here. One choice at
 * a time: saving again replaces the earlier one.
 *
 * tempat_id is always the tempat CODE ("T05"), never the numeric primary key.
 * Until authentication exists the mahasiswa is named in the request (see
 * MAHASISWA_ID in ./session).
 *
 *   GET    /api/pilihan/:mahasiswa_id
 *          -> 200 { tempat_id, namaPerusahaan, posisi, sumberUrl, tanggalAkses,
 *                   topsis_id, disimpan_pada } | 200 null when nothing is chosen
 *   PUT    /api/pilihan   body { mahasiswa_id, tempat_id, topsis_id? }
 *          -> 200, same shape (replaces any earlier choice)
 *          -> 404 unknown mahasiswa / tempat; 422 tempat not in the calculated list,
 *             or topsis_id is not this mahasiswa's result for that tempat
 *   DELETE /api/pilihan/:mahasiswa_id  -> 204 (also when nothing was chosen)
 *
 * topsis_id (the hasil_topsis row seen when choosing) is optional and the client
 * does not send it yet. VITE_USE_MOCK serves the same shapes from ./mock.
 */
export const getPilihan = () =>
  useMock ? loadMock().then((m) => m.getPilihan()) : apiFetch(`/api/pilihan/${MAHASISWA_ID}`);

export const simpanPilihan = (tempatId) =>
  useMock
    ? loadMock().then((m) => m.putPilihan(tempatId))
    : apiFetch("/api/pilihan", { method: "PUT", body: { mahasiswa_id: MAHASISWA_ID, tempat_id: tempatId } });

export const hapusPilihan = () =>
  useMock ? loadMock().then((m) => m.deletePilihan()) : apiFetch(`/api/pilihan/${MAHASISWA_ID}`, { method: "DELETE" });
