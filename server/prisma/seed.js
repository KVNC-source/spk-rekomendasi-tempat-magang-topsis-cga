/**
 * Seeds kriteria_topsis with C1–C7 using the PROVISIONAL literature weights
 * from Tabel 2.5 (via the engine's criteriaC1C7()). Weights are editable by
 * Administrator afterwards and must be replaced once the Koorprodi validates
 * them. Existing rows are left untouched so edited weights are never overwritten.
 *
 * Run: npm run seed
 */
import 'dotenv/config';
import { criteriaC1C7 } from '../engine/spk-engine/src/index.js';
import { prisma } from '../src/lib/prisma.js';

for (const c of criteriaC1C7()) {
  await prisma.kriteriaTopsis.upsert({
    where: { kode_kriteria: c.code },
    update: {},
    create: { kode_kriteria: c.code, nama_kriteria: c.label, bobot: c.weight, tipe: c.type },
  });
}

console.log('kriteria_topsis seeded (existing rows left unchanged).');
await prisma.$disconnect();
