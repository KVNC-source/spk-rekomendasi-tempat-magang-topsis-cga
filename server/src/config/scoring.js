/**
 * Scoring configuration for the Mesin Pencocokan wrapper.
 *
 * Every value here is PROVISIONAL (pending Koorprodi interview / pakar
 * validation) and overridable through environment variables, so changing
 * them is a config change, not a code change. Criteria weights are NOT here:
 * they live in the kriteria_topsis table.
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
    // Core Factor / Secondary Factor weights (§2.4.2 Langkah 3). 0.60/0.40 is
    // the value used in the engine README example — not yet validated.
    ncf: numberFromEnv('CGA_NCF', 0.6),
    nsf: numberFromEnv('CGA_NSF', 0.4),
    // C7 (Pengalaman & Sertifikasi) has no data source yet (gap 3, deferred).
    // Every alternative receives this constant, so C7 cannot affect ranking.
    c7Placeholder: numberFromEnv('C7_PLACEHOLDER', 0),
  };
}

/** Criteria the engine expects, in column order. */
export const REQUIRED_CRITERIA_CODES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
