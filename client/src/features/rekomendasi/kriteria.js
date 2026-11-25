import { formatNumber, formatTrim } from "../../lib/format";

/**
 * Names and display of the seven criteria (C1–C7), in the order the engine uses.
 * One list for every place that shows them: the Detail page and the printable
 * summary. `show` turns the raw value of `item.values[code]` into text; `flag`
 * names the `item.flags` entry that marks the value as an estimate.
 */
export const KRITERIA = [
  { code: "C1", nama: "Kesesuaian kompetensi", show: (v) => `${formatNumber(v, 1)}%` },
  {
    code: "C2",
    nama: "Kesesuaian bidang",
    show: (v) => (v >= 100 ? "Bidang sama" : v > 0 ? "Bidang serumpun" : "Bidang berbeda"),
  },
  { code: "C3", nama: "IPK-mu", show: (v) => formatNumber(v, 2) },
  { code: "C4", nama: "Jarak", show: (v) => `${formatNumber(v, 0)} km` },
  { code: "C5", nama: "Tunjangan", show: (v) => (v === 0 ? "Rp 0/bln" : `Rp ${formatTrim(v)} jt/bln`), flag: "c5Imputasi" },
  { code: "C6", nama: "Reputasi perusahaan", show: (v) => `${formatTrim(v)} dari 5`, flag: "c6Imputasi" },
  { code: "C7", nama: "Pengalaman & sertifikasi", show: (v) => formatTrim(v) },
];
