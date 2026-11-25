import { useState } from "react";
import { ChevronDown, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Card } from "../../components/ui";
import { levelLabel } from "../../lib/levels";

/** At most this many kompetensi are listed; the summary may hold more. */
export const MAKS_KOMPETENSI_PRIORITAS = 6;
/** On a phone only this many are shown first, so the ranking is not pushed far down. */
export const BARIS_AWAL_MOBILE = 3;

const levelText = (level) => (level === 0 ? "Belum punya" : `${level} · ${levelLabel(level)}`);

/**
 * "Kompetensi yang perlu kamu tingkatkan": the kompetensi that fall short most often in the
 * top recommendations. Purely descriptive (it comes from `hasil.ringkasanKesenjangan`, which the
 * API builds from the ranking) and not affected by the filter of the list below.
 * From 768px up all rows show at once; on a phone the rows after the third wait for "Tampilkan semua".
 * `maks` lowers the number of rows (the Beranda shows 3) and `tautan` ({ ke, label }) adds a link under the list.
 */
export default function KompetensiPrioritas({ ringkasan, stale = false, maks = MAKS_KOMPETENSI_PRIORITAS, tautan = null }) {
  const [semua, setSemua] = useState(false);
  if (!ringkasan) return null;

  const { jumlahDiperiksa, kompetensiPrioritas } = ringkasan;
  const daftar = kompetensiPrioritas.slice(0, maks);
  const adaTersembunyi = daftar.length > BARIS_AWAL_MOBILE;

  return (
    <Card as="section" aria-labelledby="sec-prioritas" className="motion-rise">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-tile bg-azure-100 text-navy-800">
          <Target aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0">
          <h2 id="sec-prioritas" className="font-display text-lg font-semibold leading-tight text-ink">
            Kompetensi yang perlu kamu tingkatkan
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {jumlahDiperiksa > 0
              ? `Dilihat dari ${jumlahDiperiksa} rekomendasi teratasmu.`
              : "Belum ada rekomendasi yang bisa dilihat."}
          </p>
        </div>
      </div>

      {stale && daftar.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Ringkasan ini berasal dari perhitungan terakhir. Hitung ulang untuk yang terbaru.
        </p>
      )}

      {jumlahDiperiksa > 0 && daftar.length === 0 && (
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink">
          Semua syarat kompetensi di {jumlahDiperiksa} rekomendasi teratas sudah terpenuhi.
        </p>
      )}

      {daftar.length > 0 && (
        <ol className="mt-3 divide-y divide-line">
          {daftar.map((k, index) => (
            <li
              key={k.id}
              className={`flex gap-3 py-3 first:pt-0 last:pb-0 ${!semua && index >= BARIS_AWAL_MOBILE ? "hidden md:flex" : ""}`}
            >
              <span aria-hidden="true" className="w-5 shrink-0 pt-0.5 font-mono text-sm font-semibold text-navy-700">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-base font-semibold leading-snug text-ink">{k.nama}</p>
                {/* each half stays on one line; on a narrow phone the second one drops to its own line */}
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink">
                  <span className="whitespace-nowrap">
                    Levelmu: <span className="font-semibold">{levelText(k.levelMahasiswa)}</span>
                  </span>
                  <span className="whitespace-nowrap">
                    Dibutuhkan hingga: <span className="font-semibold">{levelText(k.levelDibutuhkan)}</span>
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-muted">{k.keterangan}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {adaTersembunyi && !semua && (
        <Button variant="ghost" icon={ChevronDown} className="-mx-3 mt-2 md:hidden" onClick={() => setSemua(true)}>
          Tampilkan semua ({daftar.length})
        </Button>
      )}

      {tautan && (
        <Link to={tautan.ke} className="mt-3 inline-flex min-h-11 items-center font-semibold text-navy-800 underline underline-offset-4">
          {tautan.label}
        </Link>
      )}
    </Card>
  );
}
