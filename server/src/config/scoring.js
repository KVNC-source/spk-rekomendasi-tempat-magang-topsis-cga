/**
 * Scoring configuration for the Mesin Pencocokan wrapper.
 *
 * Nothing that decides a score lives here. The only source of the NCF/NSF
 * weights (0.6 / 0.4) and of the C2 values is the engine itself (src/engine,
 * cga.js and config.js; provisional, awaiting the dosen's approval), and the
 * engine files are not edited. The criteria weights live in the kriteria_topsis
 * table, and C7 comes from the profile's two counts (src/lib/skorPengalaman.js).
 * The pemetaan_bidang table is not used either.
 */

/** Criteria the engine expects, in column order. */
export const REQUIRED_CRITERIA_CODES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
