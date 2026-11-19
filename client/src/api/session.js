/**
 * TEMPORARY: who the signed-in mahasiswa is.
 *
 * Authentication does not exist yet, so server mode names the mahasiswa in each
 * request (PUT /api/pilihan body, GET/DELETE /api/pilihan/:mahasiswa_id). It is
 * the id of the seeded CONTOH mahasiswa unless VITE_MAHASISWA_ID says otherwise.
 * Replace this with the session once login is built.
 */
export const MAHASISWA_ID = Number(import.meta.env.VITE_MAHASISWA_ID) || 1;
