import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateCompatibilityScore, computeGap, gapToWeightScore } from '../src/cga.js';
import { runTopsis } from '../src/topsis.js';
import { haversineKm, c2Score, computeImputationValues, filterAlternatives, recommend } from '../src/matrix.js';

const dataset = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url)));
const contoh = JSON.parse(readFileSync(new URL('../data/profil_contoh.json', import.meta.url))).profil;
const close = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);

// ---------- CGA ----------
test('CGA: same averages as the Tabel 2.4 example (wajib 4.0, opsional 3.67) gives 85.93%', () => {
  const r = calculateCompatibilityScore([
    { id: 'W1', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: true }, // gap 0 -> 4.0
    { id: 'W2', levelMahasiswa: 2, levelKebutuhan: 2, isMandatory: true }, // gap 0 -> 4.0
    { id: 'O1', levelMahasiswa: 1, levelKebutuhan: 2, isMandatory: false }, // gap -1 -> 3.5
    { id: 'O2', levelMahasiswa: 2, levelKebutuhan: 2, isMandatory: false }, // gap 0 -> 4.0
    { id: 'O3', levelMahasiswa: 2, levelKebutuhan: 3, isMandatory: false }, // gap -1 -> 3.5
  ]);
  close(r.avgWajib, 4.0);
  close(r.avgOpsional, 3.6667, 0.001);
  close(r.compatibilityScore, 85.93); // BAB II shows 86.0% because 3.67 is rounded first
  assert.equal(r.aturan, 'NCF_NSF');
});

test('CGA: lowongan without opsional uses wajib only (revised §2.4.2)', () => {
  const r = calculateCompatibilityScore([
    { id: 'W1', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: true }, // 4.0
    { id: 'W2', levelMahasiswa: 1, levelKebutuhan: 2, isMandatory: true }, // 3.5
  ]);
  assert.equal(r.aturan, 'WAJIB_SAJA');
  assert.equal(r.avgOpsional, null);
  close(r.sKomp, 3.75);
  close(r.compatibilityScore, 83.33);
});

test('CGA: level 0 (tidak dimiliki) uses the normal gap, clamped at -3', () => {
  assert.equal(gapToWeightScore(computeGap(0, 1)), 3.5);
  assert.equal(gapToWeightScore(computeGap(0, 2)), 3.0);
  assert.equal(gapToWeightScore(computeGap(0, 3)), 2.0);
  assert.equal(gapToWeightScore(computeGap(0, 4)), 2.0);
  assert.throws(() => computeGap(2, 0)); // kebutuhan must stay 1-4
});

test('CGA: gap above +1 is capped (4.5 maximum)', () => {
  assert.equal(gapToWeightScore(computeGap(4, 1)), 4.5);
});

// ---------- TOPSIS ----------
test('TOPSIS: worked example (2 criteria) matches hand calculation', () => {
  const crit = [
    { code: 'K', weight: 0.6, type: 'benefit' },
    { code: 'J', weight: 0.4, type: 'cost' },
  ];
  const { ranking } = runTopsis(
    [
      { id: 'A', values: { K: 90, J: 20 } },
      { id: 'B', values: { K: 70, J: 5 } },
      { id: 'C', values: { K: 80, J: 10 } },
    ],
    crit
  );
  assert.deepEqual(ranking.map((r) => r.id), ['B', 'C', 'A']);
  close(ranking[0].ci, 0.752, 0.001);
  close(ranking[1].ci, 0.649, 0.001);
  close(ranking[2].ci, 0.248, 0.001);
});

test('TOPSIS: warns when fewer than 2 alternatives', () => {
  const { warnings } = runTopsis([{ id: 'A', values: { K: 1 } }], [{ code: 'K', weight: 1, type: 'benefit' }]);
  assert.ok(warnings.some((w) => w.includes('at least 2')));
});

// ---------- matrix helpers ----------
test('C4: haversine Jakarta (Monas) to Bandung is about 120 km', () => {
  close(haversineKm(-6.1754, 106.8272, -6.9175, 107.6191), 120.3, 0.5);
});

test('C2: identik 100, serumpun 50, tidak relevan 0', () => {
  assert.equal(c2Score('Web Development', 'Web Development'), 100);
  assert.equal(c2Score('Web Development', 'Mobile Development'), 50);
  assert.equal(c2Score('Mobile Development', 'Web Development'), 50);
  assert.equal(c2Score('Web Development', 'Jaringan Komputer'), 0);
  assert.throws(() => c2Score('Web Dev', 'Web Development'));
});

test('Imputation: median over Dipakai only; no data falls back to a constant', () => {
  const imp = computeImputationValues([
    { statusAlternatif: 'Dipakai', benefitFinansial: 1, reputasi: null },
    { statusAlternatif: 'Dipakai', benefitFinansial: 3, reputasi: null },
    { statusAlternatif: 'Dipakai', benefitFinansial: null, reputasi: null },
    { statusAlternatif: 'Dikeluarkan', benefitFinansial: 99, reputasi: 5 },
  ]);
  assert.deepEqual(imp.C5, { nilai: 2, n: 2, sumber: 'median' });
  assert.equal(imp.C6.sumber, 'tanpa_data');
});

// ---------- dataset ----------
test('Dataset: T02 (remote) and T17 (no location) are excluded, 15 remain', () => {
  const { eligible, excluded } = filterAlternatives(dataset);
  assert.equal(eligible.length, 15);
  assert.deepEqual(excluded.map((e) => e.tempatId).sort(), ['T02', 'T17']);
});

test('End to end: every example profile gets a full, valid ranking', () => {
  for (const p of contoh) {
    const out = recommend(p, dataset);
    assert.equal(out.ranking.length, 15);
    assert.deepEqual(out.ranking.map((r) => r.rank), [...Array(15)].map((_, i) => i + 1));
    for (const r of out.ranking) {
      assert.ok(r.ci >= 0 && r.ci <= 1);
      assert.ok(r.values.C1 >= 44.4 - 1e-9 && r.values.C1 <= 100 + 1e-9); // C1 range is 44.4-100%
    }
    // Pilihan page needs the source of each lowongan
    for (const r of out.ranking) assert.match(r.sumberUrl, /^https?:\/\//);
    // Detail screen needs levels and names per element
    for (const e of out.ranking[0].cga.perElement) {
      assert.equal(typeof e.nama, 'string');
      assert.notEqual(e.nama, e.id);
      assert.ok(Number.isInteger(e.levelMahasiswa) && e.levelMahasiswa >= 0 && e.levelMahasiswa <= 4);
      assert.ok(Number.isInteger(e.levelKebutuhan) && e.levelKebutuhan >= 1 && e.levelKebutuhan <= 4);
    }
    // C3 and C7 are constant per mahasiswa -> TOPSIS must warn (known open issue)
    assert.ok(out.warnings.some((w) => w.startsWith('Criterion C3')));
    assert.ok(out.warnings.some((w) => w.startsWith('Criterion C7')));
  }
});
