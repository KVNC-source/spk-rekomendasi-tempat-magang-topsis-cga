/**
 * Scoring configuration for the Mesin Pencocokan wrapper.
 *
 * Every value here is PROVISIONAL (pending Koorprodi interview / pakar
 * validation) and overridable through environment variables, so changing
 * them is a config change, not a code change. Criteria weights are NOT here:
 * they live in the kriteria_topsis table.
 *
 * spk-engine 0.3.0 (src/engine) does not read NCF/NSF from here: recommend()
 * only accepts the criteria weights, and the engine files are not edited. So
 * CGA_NCF / CGA_NSF below are NOT used yet (the engine's own 0.6 / 0.4 apply),
 * and neither is the pemetaan_bidang table: C2 values come from
 * src/engine/src/config.js (provisional, awaiting the dosen's approval). Only
 * C7_PLACEHOLDER is used.
 */

function numberFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be a number, got "${raw}"`);
  }
  return value;
}

export function getScoringConfig() {
  return {
    // NOT USED by engine 0.3.0 (see the header). Core Factor / Secondary Factor
    // weights (§2.4.2 Langkah 3); 0.60/0.40 is the engine's own value, not yet validated.
    ncf: numberFromEnv('CGA_NCF', 0.6),
    nsf: numberFromEnv('CGA_NSF', 0.4),
    // USED. C7 (Pengalaman & Sertifikasi) has no data source yet (gap 3, deferred).
    // Every alternative receives this constant, so C7 cannot affect ranking.
    c7Placeholder: numberFromEnv('C7_PLACEHOLDER', 0),
  };
}

/** Criteria the engine expects, in column order. */
export const REQUIRED_CRITERIA_CODES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
