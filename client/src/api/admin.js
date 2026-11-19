/**
 * Administrator API (server: server/src, all under /api/admin, administrator role
 * only: 401 without a session, 403 for a mahasiswa).
 *
 * These pages run against the real server only. In mock mode (VITE_USE_MOCK on)
 * they show "butuh server" instead (see features/admin/RequireServer).
 *
 * Tempat and kompetensi are addressed by their public code ("T05", "K05").
 * A validation failure is 422 { error, kesalahan: { field: message } } where field
 * is a form field name, or kebutuhan[i].kompetensi / .level_minimum / .wajib.
 * 409 means a duplicate code, or data that is still used and cannot be deleted.
 *
 *   GET  /api/admin/referensi
 *        -> { bidang: [string], status_alternatif, mode_kerja_saran, batas_koordinat,
 *             kategori: [string], kompetensi: [{ kode_kompetensi, nama_kompetensi, kategori }],
 *             saran_kode_tempat, saran_kode_kompetensi }
 *
 *   GET  /api/admin/kriteria -> { kriteria: [{ kode_kriteria, nama_kriteria, bobot, tipe }],
 *                                 total, sementara: true, catatan }
 *   PUT  /api/admin/kriteria  body { bobot: { C1: 0.3, ... C7 } }   all seven, total exactly 1.00
 *        -> the same as GET plus peringatan: [string] (a weight of 0 has no effect)
 *
 *   GET    /api/admin/kompetensi -> { kompetensi: [{ kode_kompetensi, nama_kompetensi, kategori,
 *                                    deskripsi, skala_maksimum, terpakai: { tempat, mahasiswa, hasil },
 *                                    bisa_dihapus }] }
 *   POST   /api/admin/kompetensi  body { nama_kompetensi, kategori, deskripsi? }   -> 201, the new kompetensi
 *   PUT    /api/admin/kompetensi/:kode  body { nama_kompetensi, kategori, deskripsi? }
 *   DELETE /api/admin/kompetensi/:kode  -> 204, or 409 while it is still used
 *   (the 0-4 scale is fixed and not part of these bodies)
 *
 *   GET    /api/admin/tempat -> { tempat: [Tempat] }
 *   GET    /api/admin/tempat/:kode -> Tempat
 *   POST   /api/admin/tempat  body TempatInput  -> 201, Tempat (kode_tempat optional: the next free one is used)
 *   PUT    /api/admin/tempat/:kode  body TempatInput  -> Tempat (the code cannot change)
 *   DELETE /api/admin/tempat/:kode  -> 204, or 409 once it appears in results or choices
 *
 *   TempatInput = { kode_tempat?, nama_perusahaan, posisi, bidang_industri, lokasi, latitude?,
 *                   longitude?, mode_kerja?, benefit_finansial?, reputasi?, status_alternatif,
 *                   alasan_dikeluarkan?, sumber_url?, tanggal_akses?,
 *                   kebutuhan: [{ kompetensi: "K01", level_minimum: 1-4, wajib: boolean }] }
 *   Tempat = TempatInput (numbers as numbers) + kebutuhan[].nama_kompetensi, jumlah_wajib,
 *            jumlah_opsional, terpakai: { hasil, pilihan }, bisa_dihapus
 */
import { apiFetch } from "./http";
import { useMock } from "./profil";

/** True in mock mode: the administrator pages need the real server. */
export const adminButuhServer = useMock;

export const getReferensi = () => apiFetch("/api/admin/referensi");

export const getKriteria = () => apiFetch("/api/admin/kriteria");
export const simpanBobot = (bobot) => apiFetch("/api/admin/kriteria", { method: "PUT", body: { bobot } });

export const getKompetensiAdmin = () => apiFetch("/api/admin/kompetensi").then((data) => data.kompetensi);
export const buatKompetensi = (input) => apiFetch("/api/admin/kompetensi", { method: "POST", body: input });
export const ubahKompetensi = (kode, input) => apiFetch(`/api/admin/kompetensi/${kode}`, { method: "PUT", body: input });
export const hapusKompetensi = (kode) => apiFetch(`/api/admin/kompetensi/${kode}`, { method: "DELETE" });

export const getTempatList = () => apiFetch("/api/admin/tempat").then((data) => data.tempat);
export const getTempat = (kode) => apiFetch(`/api/admin/tempat/${kode}`);
export const buatTempat = (input) => apiFetch("/api/admin/tempat", { method: "POST", body: input });
export const ubahTempat = (kode, input) => apiFetch(`/api/admin/tempat/${kode}`, { method: "PUT", body: input });
export const hapusTempat = (kode) => apiFetch(`/api/admin/tempat/${kode}`, { method: "DELETE" });
