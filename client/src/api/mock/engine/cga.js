/**
 * Competency Gap Analysis (CGA) — Profile Matching
 *
 * Implements BAB II §2.4.2 "Mekanisme Perhitungan" exactly as specified in the
 * proposal (adapted from Rahmansyah & Lusinia, 2021). Four steps:
 *   1. Gap per element:        Gap_k = Level_Mahasiswa_k - Level_Kebutuhan_k
 *   2. Convert gap -> weight score (Tabel 2.3)
 *   3. S_komp = NCF * avg(WS_wajib) + NSF * avg(WS_opsional)
 *      If the lowongan lists no optional element: S_komp = avg(WS_wajib)
 *      (rule added in revised §2.4.2, Nov 2026; returned as aturan 'WAJIB_SAJA').
 *   4. Compatibility% = (S_komp / S_maks) * 100
 *
 * LEVEL 0 (added Nov 2026): levelMahasiswa may be 0 = "tidak dimiliki"
 * (mahasiswa does not have the element at all). It enters the normal gap
 * formula (gap = 0 - kebutuhan) and is clamped at -3, so "not owned" is
 * always one step worse than Level 1 or equal to the worst score (2.0).
 * levelKebutuhan stays 1-4.
 *
 * OPEN ITEMS (not resolved as of this build — see thesis chat log):
 *   - Which competency elements are "wajib" (Core Factor) vs "opsional"
 *     (Secondary Factor) is interview question D2 — still unanswered.
 *     This module takes `isMandatory` as input per element; it does not
 *     decide the split itself.
 *   - Handling of an unassessed OPTIONAL element (business_process_analysis
 *     .docx, Process 1 Alternative Flow A1) is still undecided between
 *     "treat as Level 0" and "exclude from average". This module defaults
 *     to EXCLUDE (an unassessed optional element is simply left out of the
 *     opsional average) because that is the less destructive default, but
 *     this is provisional — flip `UNSCORED_OPTIONAL_POLICY` once Koorprodi
 *     answers A1 definitively.
 *   - A mandatory element must always be scored; this module throws if one
 *     is missing a level, rather than guessing. That matches Business Rule
 *     in business_process_analysis.docx Process 1.
 */

/** Maximum weight score attainable (gap = +1). Used as S_maks in Langkah 4. */
export const WEIGHT_SCORE_MAX = 4.5;

/** Tabel 2.3 — Konversi Gap ke Skor Bobot. Gap is capped at +1 before lookup. */
const GAP_TO_WEIGHT_SCORE = {
  1: 4.5,
  0: 4.0,
  '-1': 3.5,
  '-2': 3.0,
  '-3': 2.0,
};

/** See OPEN ITEMS above — provisional until Koorprodi confirms A1. */
export const UNSCORED_OPTIONAL_POLICY = 'EXCLUDE'; // 'EXCLUDE' | 'ZERO'

/**
 * Raw gap, capped at +1 per §2.4.2 ("kasus tepi ... di-cap pada +1").
 * levelMahasiswa is 0-4 (0 = tidak dimiliki), levelKebutuhan is 1-4, so the
 * uncapped gap ranges -4..+3. The positive side is capped here at +1; the
 * negative side is clamped to -3 in gapToWeightScore.
 */
export function computeGap(levelMahasiswa, levelKebutuhan) {
  assertValidLevel(levelMahasiswa, 'levelMahasiswa', 0);
  assertValidLevel(levelKebutuhan, 'levelKebutuhan', 1);
  const rawGap = levelMahasiswa - levelKebutuhan;
  return Math.min(rawGap, 1);
}

function assertValidLevel(level, name, min) {
  if (!Number.isInteger(level) || level < min || level > 4) {
    throw new RangeError(`${name} must be an integer ${min}-4, got: ${level}`);
  }
}

/** Tabel 2.3 lookup. Gap must already be capped (use computeGap). */
export function gapToWeightScore(cappedGap) {
  const clamped = Math.max(cappedGap, -3); // level 0 can reach -4; treated as -3
  const score = GAP_TO_WEIGHT_SCORE[String(clamped)];
  if (score === undefined) {
    throw new RangeError(`No weight-score mapping for gap: ${cappedGap}`);
  }
  return score;
}

/**
 * One row of a competency comparison.
 * @typedef {Object} CompetencyComparison
 * @property {string} id              - element id/code, for traceability
 * @property {number} levelMahasiswa  - 0-4 (0 = tidak dimiliki)
 * @property {number} levelKebutuhan  - 1-4
 * @property {boolean} isMandatory    - true = Core Factor (wajib), false = Secondary Factor (opsional)
 * @property {boolean} [assessed]     - defaults true; set false for an unscored OPTIONAL element
 */

/**
 * Full CGA pipeline for one mahasiswa–lowongan pair.
 *
 * @param {CompetencyComparison[]} competencies
 * @param {Object} [options]
 * @param {number} [options.ncf=0.60] Core Factor weight (NCF). NCF+NSF must equal 1.0.
 * @param {number} [options.nsf=0.40] Secondary Factor weight (NSF).
 * @returns {{
 *   compatibilityScore: number,
 *   sKomp: number,
 *   avgWajib: number,
 *   avgOpsional: number|null,
 *   aturan: 'NCF_NSF'|'WAJIB_SAJA',
 *   perElement: Array<{id: string, levelMahasiswa: number|null, levelKebutuhan: number, gap: number|null, weightScore: number|null, isMandatory: boolean}>,
 *   ncf: number,
 *   nsf: number,
 *   sMaks: number
 * }}
 */
export function calculateCompatibilityScore(competencies, options = {}) {
  const { ncf = 0.6, nsf = 0.4 } = options;

  if (Math.abs(ncf + nsf - 1.0) > 1e-9) {
    throw new RangeError(`NCF + NSF must equal 1.0 (got NCF=${ncf}, NSF=${nsf})`);
  }
  if (!Array.isArray(competencies) || competencies.length === 0) {
    throw new RangeError('competencies must be a non-empty array');
  }

  const perElement = [];
  const wajibScores = [];
  const opsionalScores = [];

  for (const c of competencies) {
    const assessed = c.assessed !== false;

    if (c.isMandatory && !assessed) {
      // Business rule: mandatory elements must be scored before a profile is
      // "Complete" (business_process_analysis.docx Process 1). CGA should
      // never be run against an incomplete profile — fail loudly.
      throw new RangeError(
        `Mandatory competency "${c.id}" is unassessed; CGA cannot run against an incomplete profile.`
      );
    }

    if (!assessed) {
      // Unscored OPTIONAL element — provisional policy, see OPEN ITEMS.
      if (UNSCORED_OPTIONAL_POLICY === 'ZERO') {
        perElement.push({ id: c.id, levelMahasiswa: null, levelKebutuhan: c.levelKebutuhan, gap: null, weightScore: 0, isMandatory: false });
        opsionalScores.push(0);
      } else {
        perElement.push({ id: c.id, levelMahasiswa: null, levelKebutuhan: c.levelKebutuhan, gap: null, weightScore: null, isMandatory: false });
      }
      continue;
    }

    const gap = computeGap(c.levelMahasiswa, c.levelKebutuhan);
    const weightScore = gapToWeightScore(gap);
    perElement.push({
      id: c.id,
      levelMahasiswa: c.levelMahasiswa,
      levelKebutuhan: c.levelKebutuhan,
      gap,
      weightScore,
      isMandatory: !!c.isMandatory,
    });

    if (c.isMandatory) {
      wajibScores.push(weightScore);
    } else {
      opsionalScores.push(weightScore);
    }
  }

  if (wajibScores.length === 0) {
    throw new RangeError('At least one mandatory (wajib) competency is required.');
  }
  const avgWajib = average(wajibScores);

  // Revised §2.4.2 Langkah 3 (Nov 2026): a lowongan that lists no optional
  // element is scored on its mandatory elements only. 13 of 17 lowongan in the
  // dataset have no optional element, so this is the common case, not an edge.
  let avgOpsional = null;
  let sKomp;
  let aturan;
  if (opsionalScores.length === 0) {
    sKomp = avgWajib;
    aturan = 'WAJIB_SAJA';
  } else {
    avgOpsional = average(opsionalScores);
    sKomp = ncf * avgWajib + nsf * avgOpsional;
    aturan = 'NCF_NSF';
  }
  const compatibilityScore = (sKomp / WEIGHT_SCORE_MAX) * 100;

  return {
    compatibilityScore,
    sKomp,
    avgWajib,
    avgOpsional,
    aturan,
    perElement,
    ncf,
    nsf,
    sMaks: WEIGHT_SCORE_MAX,
  };
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
