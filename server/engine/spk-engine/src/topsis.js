/**
 * TOPSIS — Technique for Order Preference by Similarity to Ideal Solution
 *
 * Implements BAB II §2.6.2 "Formulasi Matematis" exactly (standard vector
 * normalization TOPSIS, 7 stages):
 *   1. Decision matrix X (m alternatives x n criteria)
 *   2. Vector-normalize:   r_ij = x_ij / sqrt(sum_i x_ij^2)
 *   3. Weight:             v_ij = w_j * r_ij
 *   4. Ideal positive/negative (A+, A-) per criterion type (benefit/cost)
 *   5. Euclidean distance to A+ and A- per alternative
 *   6. Ci = D- / (D+ + D-)
 *   7. Rank descending by Ci
 *
 * Criteria (weights, benefit/cost type) are NOT hardcoded here. The C1-C7
 * set from Tabel 2.5 uses LITERATURE weights (0.30/0.20/0.15/0.10/0.10/
 * 0.10/0.05) that are explicitly provisional pending pakar direct-rating
 * validation (Tabel 3.2) — so this module takes a `criteria` config array
 * as input instead of baking those numbers in. See criteriaC1C7() below for
 * the literature defaults, clearly labeled as provisional.
 *
 * KNOWN OPEN ISSUE (not fixed here, by design): C3 (IPK) and C7 (Pengalaman
 * & Sertifikasi) are mahasiswa-level attributes, constant across every
 * alternative within one run for one student — per modul_tempat_magang_
 * lowongan.docx this means they contribute nothing to the ranking (ideal
 * positive == ideal negative on those columns, distance contribution = 0).
 * `runTopsis` emits a `warnings` entry when it detects a constant column,
 * rather than silently dropping or reinterpreting the criterion — the fix
 * (redefine C3/C7 as lowongan-level requirements, or remove them and
 * redistribute weight) is still an open decision.
 */

/**
 * @typedef {Object} Criterion
 * @property {string} code    e.g. "C1"
 * @property {number} weight  0-1, all criteria weights must sum to 1.0
 * @property {'benefit'|'cost'} type
 */

/** Tabel 2.5 literature-synthesis weights — PROVISIONAL until Tabel 3.2 pakar validation. */
export function criteriaC1C7() {
  return [
    { code: 'C1', label: 'Skor Kesesuaian Kompetensi', weight: 0.3, type: 'benefit' },
    { code: 'C2', label: 'Kesesuaian Minat / Bidang Industri', weight: 0.2, type: 'benefit' },
    { code: 'C3', label: 'Prestasi Akademik (IPK)', weight: 0.15, type: 'benefit' },
    { code: 'C4', label: 'Jarak Lokasi', weight: 0.1, type: 'cost' },
    { code: 'C5', label: 'Benefit Finansial', weight: 0.1, type: 'benefit' },
    { code: 'C6', label: 'Reputasi Perusahaan', weight: 0.1, type: 'benefit' },
    { code: 'C7', label: 'Pengalaman & Sertifikasi Mahasiswa', weight: 0.05, type: 'benefit' },
  ];
}

function assertWeightsSumToOne(criteria) {
  const sum = criteria.reduce((s, c) => s + c.weight, 0);
  if (Math.abs(sum - 1.0) > 1e-6) {
    throw new RangeError(`Criteria weights must sum to 1.0, got ${sum}`);
  }
}

/**
 * @param {Array<{id: string, values: Record<string, number>}>} alternatives
 *   e.g. [{ id: 'lowongan-1', values: { C1: 86.0, C2: 100, C3: 3.5, ... } }, ...]
 * @param {Criterion[]} criteria
 * @returns {{
 *   ranking: Array<{id: string, ci: number, dPlus: number, dMinus: number, rank: number}>,
 *   warnings: string[],
 *   steps: {
 *     criteria: Array<{code: string, weight: number, type: string}>,
 *     alternativeIds: string[],
 *     decisionMatrix: number[][],
 *     columnNorms: number[],
 *     normalizedMatrix: number[][],
 *     weightedMatrix: number[][],
 *     idealPositive: number[],
 *     idealNegative: number[],
 *     distances: Array<{dPlus: number, dMinus: number}>
 *   }
 * }}
 */
export function runTopsis(alternatives, criteria) {
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    throw new RangeError('alternatives must be a non-empty array');
  }
  assertWeightsSumToOne(criteria);

  const codes = criteria.map((c) => c.code);
  for (const alt of alternatives) {
    for (const code of codes) {
      if (typeof alt.values[code] !== 'number' || Number.isNaN(alt.values[code])) {
        throw new RangeError(`Alternative "${alt.id}" is missing a numeric value for ${code}`);
      }
    }
  }

  const warnings = [];

  // Stage 1: decision matrix X — alternatives.length rows x codes.length cols
  const X = alternatives.map((alt) => codes.map((code) => alt.values[code]));

  // Stage 2: vector normalization, column-wise
  const colNorms = codes.map((_, j) => Math.sqrt(X.reduce((s, row) => s + row[j] ** 2, 0)));
  codes.forEach((code, j) => {
    if (colNorms[j] === 0) {
      warnings.push(`Criterion ${code} is all-zero across alternatives; normalization is degenerate (0/0 treated as 0).`);
    }
  });
  const R = X.map((row) => row.map((x, j) => (colNorms[j] === 0 ? 0 : x / colNorms[j])));

  // Degenerate-column check: flag a criterion that is constant across every
  // alternative (this is exactly the C3/C7 symptom described above).
  codes.forEach((code, j) => {
    const colValues = X.map((row) => row[j]);
    const allEqual = colValues.every((v) => v === colValues[0]);
    if (allEqual && colValues.length > 1) {
      warnings.push(
        `Criterion ${code} has an identical value across all ${colValues.length} alternatives; it cannot influence ranking (contributes 0 to every distance). See known open issue re: C3/C7.`
      );
    }
  });

  // Stage 3: weighted normalized matrix V
  const weights = criteria.map((c) => c.weight);
  const V = R.map((row) => row.map((r, j) => r * weights[j]));

  // Stage 4: ideal positive (A+) / ideal negative (A-)
  const Aplus = codes.map((_, j) => {
    const col = V.map((row) => row[j]);
    return criteria[j].type === 'benefit' ? Math.max(...col) : Math.min(...col);
  });
  const Aminus = codes.map((_, j) => {
    const col = V.map((row) => row[j]);
    return criteria[j].type === 'benefit' ? Math.min(...col) : Math.max(...col);
  });

  // Stage 5: Euclidean distances
  const distances = V.map((row) => {
    const dPlus = Math.sqrt(row.reduce((s, v, j) => s + (v - Aplus[j]) ** 2, 0));
    const dMinus = Math.sqrt(row.reduce((s, v, j) => s + (v - Aminus[j]) ** 2, 0));
    return { dPlus, dMinus };
  });

  // Stage 6: Ci
  const scored = alternatives.map((alt, i) => {
    const { dPlus, dMinus } = distances[i];
    const denom = dPlus + dMinus;
    const ci = denom === 0 ? 0 : dMinus / denom;
    return { id: alt.id, ci, dPlus, dMinus };
  });

  // Stage 7: rank descending by Ci
  const ranking = [...scored]
    .sort((a, b) => b.ci - a.ci)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  // Intermediate steps for traceability (BAB IV). Rows follow the order of
  // `alternatives`, columns follow the order of `criteria`.
  const steps = {
    criteria: criteria.map((c) => ({ code: c.code, weight: c.weight, type: c.type })),
    alternativeIds: alternatives.map((alt) => alt.id),
    decisionMatrix: X,
    columnNorms: colNorms,
    normalizedMatrix: R,
    weightedMatrix: V,
    idealPositive: Aplus,
    idealNegative: Aminus,
    distances,
  };

  return { ranking, warnings, steps };
}
