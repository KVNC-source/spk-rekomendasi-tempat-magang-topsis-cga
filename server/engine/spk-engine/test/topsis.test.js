import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTopsis, criteriaC1C7 } from '../src/topsis.js';

test('runTopsis: rejects weights that do not sum to 1.0', () => {
  const criteria = [
    { code: 'C1', weight: 0.5, type: 'benefit' },
    { code: 'C2', weight: 0.6, type: 'benefit' },
  ];
  const alternatives = [
    { id: 'A', values: { C1: 1, C2: 1 } },
    { id: 'B', values: { C1: 2, C2: 2 } },
  ];
  assert.throws(() => runTopsis(alternatives, criteria), RangeError);
});

test('runTopsis: rejects an alternative missing a criterion value', () => {
  const criteria = [{ code: 'C1', weight: 1.0, type: 'benefit' }];
  const alternatives = [{ id: 'A', values: {} }];
  assert.throws(() => runTopsis(alternatives, criteria), RangeError);
});

test('runTopsis: exact result for a 2-alternative / 1-criterion BENEFIT case', () => {
  // With 2 alternatives and 1 criterion, the higher-value alternative lands
  // exactly on the ideal positive solution (Ci=1) and the lower one exactly
  // on the ideal negative solution (Ci=0) — hand-verifiable, no ambiguity.
  const criteria = [{ code: 'C1', weight: 1.0, type: 'benefit' }];
  const alternatives = [
    { id: 'high', values: { C1: 10 } },
    { id: 'low', values: { C1: 5 } },
  ];
  const { ranking } = runTopsis(alternatives, criteria);

  const high = ranking.find((r) => r.id === 'high');
  const low = ranking.find((r) => r.id === 'low');

  assert.ok(Math.abs(high.ci - 1.0) < 1e-9);
  assert.ok(Math.abs(low.ci - 0.0) < 1e-9);
  assert.equal(high.rank, 1);
  assert.equal(low.rank, 2);
});

test('runTopsis: exact result for a 2-alternative / 1-criterion COST case (lower wins)', () => {
  const criteria = [{ code: 'C4', weight: 1.0, type: 'cost' }];
  const alternatives = [
    { id: 'far', values: { C4: 10 } },
    { id: 'near', values: { C4: 5 } },
  ];
  const { ranking } = runTopsis(alternatives, criteria);

  const near = ranking.find((r) => r.id === 'near');
  const far = ranking.find((r) => r.id === 'far');

  assert.ok(Math.abs(near.ci - 1.0) < 1e-9);
  assert.ok(Math.abs(far.ci - 0.0) < 1e-9);
  assert.equal(near.rank, 1);
});

test('runTopsis: multi-criteria ranking matches manual calculation (3 alt / 2 crit)', () => {
  // Hand-verified: C1 benefit (w=0.5), C2 cost (w=0.5).
  // B has a decent C1 and the lowest (best) C2 -> wins.
  // C has the best C1 but the worst (highest) C2 -> loses badly.
  // A is balanced in between.
  const criteria = [
    { code: 'C1', weight: 0.5, type: 'benefit' },
    { code: 'C2', weight: 0.5, type: 'cost' },
  ];
  const alternatives = [
    { id: 'A', values: { C1: 80, C2: 10 } },
    { id: 'B', values: { C1: 60, C2: 5 } },
    { id: 'C', values: { C1: 90, C2: 20 } },
  ];
  const { ranking } = runTopsis(alternatives, criteria);
  const order = ranking.sort((a, b) => a.rank - b.rank).map((r) => r.id);

  assert.deepEqual(order, ['B', 'A', 'C']);
  ranking.forEach((r) => {
    assert.ok(r.ci >= 0 && r.ci <= 1);
  });
});

test('runTopsis: warns when a criterion is constant across all alternatives (C3/C7 symptom)', () => {
  // Simulates the known open issue: C3 (IPK) is a mahasiswa-level attribute,
  // identical across every lowongan alternative for one student's run.
  const criteria = [
    { code: 'C1', weight: 0.7, type: 'benefit' },
    { code: 'C3', weight: 0.3, type: 'benefit' },
  ];
  const alternatives = [
    { id: 'lowongan-1', values: { C1: 80, C3: 3.5 } },
    { id: 'lowongan-2', values: { C1: 60, C3: 3.5 } },
    { id: 'lowongan-3', values: { C1: 90, C3: 3.5 } },
  ];
  const { warnings } = runTopsis(alternatives, criteria);

  assert.ok(warnings.some((w) => w.includes('C3')));
});

test('criteriaC1C7: weights from Tabel 2.5 sum to 1.0 (literature defaults, pending pakar validation)', () => {
  const criteria = criteriaC1C7();
  const sum = criteria.reduce((s, c) => s + c.weight, 0);
  assert.ok(Math.abs(sum - 1.0) < 1e-9);
  assert.equal(criteria.length, 7);
  assert.equal(criteria.find((c) => c.code === 'C4').type, 'cost');
});

test('runTopsis: exposes intermediate steps (hand-calculable 2 alt / 2 crit, 3-4-5 example)', () => {
  // C1 benefit, C2 cost, weights 0.5 / 0.5. Column norms are both sqrt(9+16) = 5.
  //   R = [[0.6, 0.8], [0.8, 0.6]]        (A = 3,4 ; B = 4,3)
  //   V = [[0.3, 0.4], [0.4, 0.3]]
  //   A+ = [max 0.4, min(cost) 0.3] ; A- = [min 0.3, max(cost) 0.4]
  //   A: D+ = sqrt(0.01 + 0.01), D- = 0   -> Ci = 0
  //   B: D+ = 0, D- = sqrt(0.01 + 0.01)   -> Ci = 1
  const criteria = [
    { code: 'C1', weight: 0.5, type: 'benefit' },
    { code: 'C2', weight: 0.5, type: 'cost' },
  ];
  const alternatives = [
    { id: 'A', values: { C1: 3, C2: 4 } },
    { id: 'B', values: { C1: 4, C2: 3 } },
  ];
  const { ranking, steps } = runTopsis(alternatives, criteria);
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} !~ ${b}`);

  assert.deepEqual(steps.alternativeIds, ['A', 'B']);
  assert.deepEqual(steps.decisionMatrix, [[3, 4], [4, 3]]);
  assert.deepEqual(steps.columnNorms, [5, 5]);
  [[0.6, 0.8], [0.8, 0.6]].forEach((row, i) => row.forEach((v, j) => close(steps.normalizedMatrix[i][j], v)));
  [[0.3, 0.4], [0.4, 0.3]].forEach((row, i) => row.forEach((v, j) => close(steps.weightedMatrix[i][j], v)));
  [0.4, 0.3].forEach((v, j) => close(steps.idealPositive[j], v));
  [0.3, 0.4].forEach((v, j) => close(steps.idealNegative[j], v));
  close(steps.distances[0].dPlus, Math.sqrt(0.02));
  close(steps.distances[0].dMinus, 0);
  close(steps.distances[1].dPlus, 0);
  close(steps.distances[1].dMinus, Math.sqrt(0.02));
  assert.deepEqual(steps.criteria.map((c) => c.code), ['C1', 'C2']);
  close(ranking.find((r) => r.id === 'A').ci, 0);
  close(ranking.find((r) => r.id === 'B').ci, 1);
});
