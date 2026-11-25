/**
 * Profil + master-data API.
 *
 * CONTRACT. Every endpoint below is implemented by server/src (GET /api/kompetensi
 * reads the kompetensi table on every call, so a kompetensi the Administrator adds
 * shows up in the form at once). VITE_USE_MOCK (default: on) serves the same shapes
 * from ./mock. Set VITE_USE_MOCK=false to call the real API.
 *
 *   GET  /api/kompetensi
 *        -> [{ kompetensi_id: "K01", nama_kompetensi, kategori, deskripsi, skala_maksimum }]
 *   GET  /api/bidang-minat
 *        -> [string]        EXACTLY the engine's BIDANG values (the engine
 *                           throws on an unknown bidang)
 *   GET  /api/kota-domisili
 *        -> [{ kota, provinsi, lat, lon }]   the 27 kota of the master list
 *   GET  /api/mahasiswa/me/profil
 *        -> { mahasiswa: { mahasiswa_id, nim, nama, angkatan },
 *             status: "Draf" | "Lengkap",   server-computed: "Lengkap" only when all
 *                          21 kompetensi and every field below are filled
 *             ipk: number|null, minat_bidang: string|null,
 *             domisili: { kota, lat, lon }|null,
 *             jumlah_proyek: number|null, jumlah_sertifikasi: number|null,   (C7 inputs)
 *             kompetensi: [{ kompetensi_id, level_penguasaan }],   level 0–4; an
 *                          element that is absent means NOT YET ANSWERED
 *             diperbarui_pada: ISO date }
 *   PUT  /api/mahasiswa/me/profil
 *        body { ipk, minat_bidang, domisili, jumlah_proyek, jumlah_sertifikasi,
 *               kompetensi: [{ kompetensi_id, level_penguasaan }],
 *               nama?, angkatan? }       nama and angkatan are optional: when they are not sent the
 *                                        saved values stay. The NIM is never changed (a nim in the
 *                                        body is ignored). Same rules as registration.
 *        -> 200, same shape as GET. Errors: { error: string } with 400 / 422.
 *        A draft is accepted: kompetensi may be partial and ipk / minat_bidang /
 *        domisili / jumlah_* may be null. Completeness is enforced when
 *        recommendations are requested.
 *        PUT REPLACES the whole set of answers: a kompetensi that is not sent
 *        counts as not answered, so the client sends every answer it has, always.
 *        A value that is sent must be valid, else 422 { error, kesalahan:{ field: message } }
 *        (ipk 0-4, minat_bidang one of the list, domisili.kota one of the list — its
 *        lat/lon are ignored, jumlah_* whole numbers 0-99, level 0 to skala_maksimum).
 *
 * "me" is the signed-in mahasiswa (session cookie); only the mahasiswa role may call it.
 * C7 is sent as two counts (only projects and certifications relevant to IT count);
 * the server turns them into the C7 score with one formula, server/src/lib/skorPengalaman.js,
 * which the mock imports too.
 */
import { apiFetch } from "./http";

// Development: the mock is on unless VITE_USE_MOCK=false. Production build: the mock is off unless
// VITE_USE_MOCK=true, so a deployed site can never answer from the in-browser mock by accident.
export const useMock = import.meta.env.PROD
  ? import.meta.env.VITE_USE_MOCK === "true"
  : import.meta.env.VITE_USE_MOCK !== "false";
export const loadMock = () => import("./mock/mockApi");

export const getKompetensi = () => (useMock ? loadMock().then((m) => m.getKompetensi()) : apiFetch("/api/kompetensi"));
export const getBidangMinat = () => (useMock ? loadMock().then((m) => m.getBidangMinat()) : apiFetch("/api/bidang-minat"));
export const getKotaDomisili = () => (useMock ? loadMock().then((m) => m.getKotaDomisili()) : apiFetch("/api/kota-domisili"));
export const getProfil = () => (useMock ? loadMock().then((m) => m.getProfil()) : apiFetch("/api/mahasiswa/me/profil"));
export const saveProfil = (payload) =>
  useMock
    ? loadMock().then((m) => m.putProfil(payload))
    : apiFetch("/api/mahasiswa/me/profil", { method: "PUT", body: payload });
