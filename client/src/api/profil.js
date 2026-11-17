/**
 * Profil + master-data API.
 *
 * CONTRACT — none of these endpoints exist on the server yet (server/ is
 * read-only for the frontend). The client codes against these shapes; until the
 * server implements them, VITE_USE_MOCK (default: on) serves the same shapes
 * from ./mock. Set VITE_USE_MOCK=false to call the real API.
 *
 *   GET  /api/kompetensi
 *        -> [{ kompetensi_id: "K01", nama_kompetensi, kategori, deskripsi, skala_maksimum }]
 *   GET  /api/bidang-minat
 *        -> [string]        EXACTLY the engine's BIDANG values (the engine
 *                           throws on an unknown bidang)
 *   GET  /api/kota-domisili
 *        -> [{ kota, lat, lon }]
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
 *               kompetensi: [{ kompetensi_id, level_penguasaan }] }
 *        -> 200, same shape as GET. Errors: { error: string } with 400 / 422.
 *        A draft is accepted: kompetensi may be partial and ipk / minat_bidang /
 *        domisili / jumlah_* may be null. Completeness is enforced when
 *        recommendations are requested.
 *
 * "me" assumes the server resolves the signed-in mahasiswa (auth not specified).
 * C7 is sent as two counts; the server turns them into the C7 score.
 */
import { apiFetch } from "./http";

export const useMock = import.meta.env.VITE_USE_MOCK !== "false";
export const loadMock = () => import("./mock/mockApi");

export const getKompetensi = () => (useMock ? loadMock().then((m) => m.getKompetensi()) : apiFetch("/api/kompetensi"));
export const getBidangMinat = () => (useMock ? loadMock().then((m) => m.getBidangMinat()) : apiFetch("/api/bidang-minat"));
export const getKotaDomisili = () => (useMock ? loadMock().then((m) => m.getKotaDomisili()) : apiFetch("/api/kota-domisili"));
export const getProfil = () => (useMock ? loadMock().then((m) => m.getProfil()) : apiFetch("/api/mahasiswa/me/profil"));
export const saveProfil = (payload) =>
  useMock
    ? loadMock().then((m) => m.putProfil(payload))
    : apiFetch("/api/mahasiswa/me/profil", { method: "PUT", body: payload });
