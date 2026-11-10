import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeGap,
  gapToWeightScore,
  calculateCompatibilityScore,
  WEIGHT_SCORE_MAX,
} from '../src/cga.js';

test('computeGap: basic cases', () => {
  assert.equal(computeGap(3, 3), 0);
  assert.equal(computeGap(2, 3), -1);
  assert.equal(computeGap(3, 2), 1);
});

test('computeGap: caps at +1 per §2.4.2 ("kasus tepi ... di-cap pada +1")', () => {
  assert.equal(computeGap(4, 1), 1); // raw gap +3, capped to +1
  assert.equal(computeGap(4, 2), 1); // raw gap +2, capped to +1
});

test('computeGap: rejects out-of-scale levels', () => {
  assert.throws(() => computeGap(5, 2), RangeError);
  assert.throws(() => computeGap(2, 0), RangeError);
});

test('gapToWeightScore: matches Tabel 2.3 exactly', () => {
  assert.equal(gapToWeightScore(1), 4.5);
  assert.equal(gapToWeightScore(0), 4.0);
  assert.equal(gapToWeightScore(-1), 3.5);
  assert.equal(gapToWeightScore(-2), 3.0);
  assert.equal(gapToWeightScore(-3), 2.0);
});

test('WEIGHT_SCORE_MAX is 4.5 (S_maks, per §2.4.2 Langkah 4)', () => {
  assert.equal(WEIGHT_SCORE_MAX, 4.5);
});

/**
 * Validates the full pipeline against Tabel 2.4's worked example
 * (Mahasiswa A vs. a Web Development lowongan, proposal p.24).
 *
 * NOTE: the proposal's own narrative rounds avg_opsional to 3.67 before
 * computing the final percentage, landing on "86.0%". Carried at full
 * precision, avg_opsional = 11/3 = 3.6666... and the result is ~85.93%.
 * This test asserts against the full-precision value with a tolerance wide
 * enough to also accept the proposal's rounded figure — the ~0.07pp gap is
 * the proposal text's own rounding, not a bug in this module. Worth a note
 * to your pembimbing if exact figures ever get compared in BAB IV.
 */
test('calculateCompatibilityScore: reproduces Tabel 2.4 worked example', () => {
  const competencies = [
    { id: 'Pemrograman Web', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: true },
    { id: 'React.js/Vue.js', levelMahasiswa: 2, levelKebutuhan: 3, isMandatory: true },
    { id: 'Backend', levelMahasiswa: 2, levelKebutuhan: 2, isMandatory: true },
    { id: 'Basis Data SQL', levelMahasiswa: 3, levelKebutuhan: 2, isMandatory: true },
    { id: 'DevOps/Docker', levelMahasiswa: 1, levelKebutuhan: 2, isMandatory: false },
    { id: 'Komunikasi Tim', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: false },
    { id: 'Manajemen Waktu', levelMahasiswa: 2, levelKebutuhan: 3, isMandatory: false },
  ];

  const result = calculateCompatibilityScore(competencies, { ncf: 0.6, nsf: 0.4 });

  assert.equal(result.avgWajib, 4.0);
  assert.ok(Math.abs(result.avgOpsional - 3.6667) < 0.001);
  assert.ok(Math.abs(result.sKomp - 3.8667) < 0.001);
  // Proposal states 86.0%; full-precision gives ~85.93%. Tolerance covers both.
  assert.ok(
    Math.abs(result.compatibilityScore - 86.0) < 0.15,
    `expected ~86.0% (proposal) / ~85.93% (full precision), got ${result.compatibilityScore}`
  );
});

test('calculateCompatibilityScore: rejects NCF+NSF != 1.0', () => {
  const competencies = [
    { id: 'A', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: true },
    { id: 'B', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: false },
  ];
  assert.throws(
    () => calculateCompatibilityScore(competencies, { ncf: 0.5, nsf: 0.6 }),
    RangeError
  );
});

test('calculateCompatibilityScore: throws if a mandatory element is unassessed', () => {
  const competencies = [
    { id: 'A', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: true, assessed: false },
    { id: 'B', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: false },
  ];
  assert.throws(() => calculateCompatibilityScore(competencies), RangeError);
});

test('calculateCompatibilityScore: throws if no optional element is scored (open edge case)', () => {
  const competencies = [
    { id: 'A', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: true },
    { id: 'B', levelMahasiswa: 2, levelKebutuhan: 3, isMandatory: true },
  ];
  assert.throws(() => calculateCompatibilityScore(competencies), RangeError);
});

test('calculateCompatibilityScore: throws on empty input', () => {
  assert.throws(() => calculateCompatibilityScore([]), RangeError);
});

test('calculateCompatibilityScore: exposes ncf, nsf and sMaks used in the calculation', () => {
  const result = calculateCompatibilityScore(
    [
      { id: 'A', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: true },
      { id: 'B', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: false },
    ],
    { ncf: 0.7, nsf: 0.3 }
  );
  assert.equal(result.ncf, 0.7);
  assert.equal(result.nsf, 0.3);
  assert.equal(result.sMaks, WEIGHT_SCORE_MAX);
  // gap 0 -> WS 4.0 for both; S_komp = 4.0 -> 4.0 / 4.5 * 100
  assert.ok(Math.abs(result.compatibilityScore - (4 / 4.5) * 100) < 1e-9);
});
