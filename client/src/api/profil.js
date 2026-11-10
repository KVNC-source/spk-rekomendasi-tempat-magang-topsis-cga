/**
 * Profil Kompetensi API.
 *
 * CONTRACT — these endpoints do NOT exist on the server yet (server/ is
 * read-only for the frontend). The client codes against this shape; until the
 * server implements it, VITE_USE_MOCK (default: on) serves the same shape from
 * ./profilMock.js. Set VITE_USE_MOCK=false to call the real API.
 *
 *   GET  /api/kompetensi
 *        -> [{ kompetensi_id, nama_kompetensi, kategori, deskripsi, skala_maksimum }]
 *   GET  /api/bidang-minat
 *        -> [string]                      (standardized bidang list, for C2)
 *   GET  /api/mahasiswa/me/profil
 *        -> { mahasiswa: { mahasiswa_id, nim, nama, angkatan },
 *             ipk: number, minat_bidang: string,
 *             kompetensi: [{ kompetensi_id, level_penguasaan }] }
 *   PUT  /api/mahasiswa/me/profil
 *        body { ipk, minat_bidang, kompetensi: [{ kompetensi_id, level_penguasaan }] }
 *        -> 200, same shape as GET. Errors: { error: string } with 400 / 422.
 *
 * Auth is not specified yet; "me" assumes the server resolves the signed-in
 * mahasiswa.
 */
import { apiFetch } from "./http";
import * as mock from "./profilMock";

const useMock = import.meta.env.VITE_USE_MOCK !== "false";

export const getKompetensi = () => (useMock ? mock.getKompetensi() : apiFetch("/api/kompetensi"));
export const getBidangMinat = () => (useMock ? mock.getBidangMinat() : apiFetch("/api/bidang-minat"));
export const getProfil = () => (useMock ? mock.getProfil() : apiFetch("/api/mahasiswa/me/profil"));
export const saveProfil = (payload) =>
  useMock ? mock.putProfil(payload) : apiFetch("/api/mahasiswa/me/profil", { method: "PUT", body: payload });
