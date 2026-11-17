/**
 * Engine configuration that is a research decision, not code logic.
 * Change values here only; matrix.js reads them.
 */

/** Standard bidang list, as used in the dataset column bidang_industri (C2). */
export const BIDANG = [
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Software Testing (QA)',
  'UI/UX Design',
  'IT Support',
  'Jaringan Komputer',
];

/**
 * C2 (Kesesuaian Minat/Bidang) mapping, §2.6.3: 100 = bidang identik,
 * partial = bidang serumpun, 0 = tidak relevan.
 *
 * PROVISIONAL (Nov 2026): the value 50 and the serumpun pairs below are a
 * proposal awaiting approval by the dosen pembimbing / Koorprodi. Pairs are
 * symmetric.
 */
export const C2_IDENTIK = 100;
export const C2_SERUMPUN = 50;
export const C2_TIDAK_RELEVAN = 0;
export const C2_PASANGAN_SERUMPUN = [
  ['Web Development', 'Mobile Development'],
  ['Web Development', 'Software Testing (QA)'],
  ['Web Development', 'UI/UX Design'],
  ['Web Development', 'Data Science'],
  ['Mobile Development', 'UI/UX Design'],
  ['Mobile Development', 'Software Testing (QA)'],
  ['Jaringan Komputer', 'IT Support'],
];

/**
 * Fallback for C5/C6 when NO alternative in the dataset has a real value, so
 * no median exists. Every alternative then gets the same value, which means
 * the criterion has no influence on the ranking (the engine warns about it).
 * C6 uses the middle of its 1-5 scale.
 */
export const NILAI_TANPA_DATA = { C5: 1, C6: 3 };

/** A lowongan whose mode_kerja matches this is treated as remote and excluded. */
export const POLA_REMOTE = /remote|wfh/i;
