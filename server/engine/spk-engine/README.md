# SPK CGA + TOPSIS Engine

Standalone, dependency-free scoring engine for *Sistem Pendukung Keputusan
Rekomendasi Tempat Magang* — implements the CGA (Profile Matching) and
TOPSIS formulas exactly as specified in BAB II of the proposal (§2.4.2,
§2.6.2), so this is the mathematically risky part of the system, built and
tested in isolation before any UI/API/database work wraps around it.

No dependencies beyond Node.js itself. Node 18+ required (uses the built-in
`node:test` runner).

## Install & run tests

```bash
npm install   # no-op today, but keeps this a normal npm package
npm test
```

All 19 tests pass, including one that reproduces Tabel 2.4's worked example
(Mahasiswa A, Web Development lowongan) directly from the proposal.

## What's in here

- `src/cga.js` — Competency Gap Analysis / Profile Matching (gap →
  weight-score conversion → Core/Secondary Factor aggregation →
  compatibility %).
- `src/topsis.js` — TOPSIS (decision matrix → vector normalization →
  weighting → ideal solutions → distances → Ci → ranking).
- `src/index.js` — public exports.
- `test/` — unit tests, including hand-verified exact-value cases and the
  Tabel 2.4 regression test.

## Deliberately NOT decided in this code

This module is built to be correct against the formulas you already have —
it does **not** resolve any of the open design questions from earlier in
the thesis review. Specifically:

1. **C3 (IPK) / C7 (Pengalaman & Sertifikasi) degeneracy.** These are
   mahasiswa-level attributes, constant across every alternative in one
   student's TOPSIS run — they can't affect the ranking. `runTopsis` now
   detects this at runtime and returns a `warnings` entry naming the
   constant criterion, instead of silently producing a ranking that quietly
   ignores two of your seven criteria. The actual fix (redefine C3/C7 as
   lowongan-level requirements, per `modul_tempat_magang_lowongan.docx`
   Bagian 4, or drop them and redistribute their 0.20 weight) is still your
   call — pending Tabel 3.2 pakar input or your own decision.

2. **Pakar-validated weights.** `criteriaC1C7()` returns the *literature*
   weights from Tabel 2.5 (0.30/0.20/0.15/0.10/0.10/0.10/0.05), explicitly
   labeled provisional. `runTopsis` takes a `criteria` array as a parameter
   rather than hardcoding these, so swapping in Koorprodi/pembimbing's
   direct-rating weights later (Tabel 3.2) is a config change, not a code
   change.

3. **Core Factor / Secondary Factor split (D2).** Which competency elements
   are wajib vs. opsional is passed in per-call (`isMandatory` on each
   competency) — this module doesn't contain an opinion about which
   elements belong in which bucket, because that's still an unanswered
   interview question.

4. **Unscored optional competency elements.** `business_process_analysis
   .docx` Process 1 leaves open whether an unassessed *optional* element
   should be treated as Level 0 or excluded from the average. This module
   defaults to exclude (`UNSCORED_OPTIONAL_POLICY = 'EXCLUDE'` in
   `cga.js`), flagged as provisional — flip it once that's resolved. An
   unassessed **mandatory** element is never silently handled either way:
   it throws, because a profile with an unscored mandatory element isn't
   supposed to reach CGA at all (per the same doc's Business Rules).

None of these are bugs — they're the genuine open items from BAB
I/II/III review, kept visible in code and tests rather than quietly
resolved one way so the thesis text and the code can't drift apart.

## Minor note on the Tabel 2.4 worked example

Carried at full floating-point precision, the example in Tabel 2.4
computes to **compatibility ≈ 85.93%**, not the 86.0% printed in the
proposal. The difference comes from the proposal's own narrative rounding
`avg_opsional` to 3.67 (vs. the exact 11/3 = 3.6667) before taking the
final percentage. The test tolerance accounts for both values; this is a
rounding note for your own awareness, not something the code changes on
its own.

## Using it

```js
import { calculateCompatibilityScore, runTopsis, criteriaC1C7 } from './src/index.js';

// 1. CGA for one mahasiswa–lowongan pair
const cga = calculateCompatibilityScore([
  { id: 'html-css-js', levelMahasiswa: 3, levelKebutuhan: 3, isMandatory: true },
  { id: 'react-vue', levelMahasiswa: 2, levelKebutuhan: 3, isMandatory: true },
  // ...
], { ncf: 0.6, nsf: 0.4 });
// cga.compatibilityScore -> this becomes C1 for that alternative

// 2. TOPSIS across all eligible lowongan for that mahasiswa
const { ranking, warnings } = runTopsis(
  [
    { id: 'lowongan-1', values: { C1: cga.compatibilityScore, C2: 100, C3: 3.5, C4: 5, C5: 2, C6: 4, C7: 1 } },
    // ...more alternatives
  ],
  criteriaC1C7() // swap for pakar-validated weights once Tabel 3.2 is final
);
// ranking -> sorted by Ci descending, each with { id, ci, rank }
// warnings -> non-fatal issues worth surfacing (e.g. degenerate criteria)
```
