/**
 * The two sample accounts that `npm run seed` creates (prisma/seed.js). They belong to the
 * project, not to a respondent, so the administrator's delete script never removes them.
 * test/hapusAkun.test.js checks that the seed still creates exactly these.
 */
export const EMAIL_AKUN_CONTOH = Object.freeze(['contoh-web-manado@example.invalid', 'contoh-admin@example.invalid']);

/** The sample mahasiswa's NIM starts with this (a real NIM is digits only). */
export const AWALAN_NIM_CONTOH = 'CONTOH-';
