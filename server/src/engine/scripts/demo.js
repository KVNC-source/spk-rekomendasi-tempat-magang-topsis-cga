// Prints the ranking for each example profile.  Run:  node scripts/demo.js
import { readFileSync } from 'node:fs';
import { recommend } from '../src/matrix.js';

const dataset = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url)));
const { profil } = JSON.parse(readFileSync(new URL('../data/profil_contoh.json', import.meta.url)));
const f = (x, d = 1) => (x === null || x === undefined ? '-' : x.toFixed(d));

for (const p of profil) {
  const out = recommend(p, dataset);
  console.log(`\n=== ${p.id} (${p.keterangan}) ===`);
  console.table(
    out.ranking.map((r) => ({
      rank: r.rank,
      id: r.id,
      perusahaan: r.namaPerusahaan.slice(0, 26),
      bidang: r.bidang,
      'C1 %': f(r.values.C1),
      C2: r.values.C2,
      'C4 km': f(r.values.C4, 0),
      C5: f(r.values.C5, 2) + (r.flags.c5Imputasi ? '*' : ''),
      Ci: f(r.ci, 3),
      'gap terbesar': r.kesenjangan[0] ? `${r.kesenjangan[0].id} (${r.kesenjangan[0].gap})` : '-',
    }))
  );
  console.log('* = nilai imputasi. Dikeluarkan:', out.excluded.map((e) => `${e.tempatId} (${e.alasan})`).join('; '));
  console.log('Imputasi:', JSON.stringify(out.imputasi));
  console.log('Peringatan:\n - ' + out.warnings.join('\n - '));
}
