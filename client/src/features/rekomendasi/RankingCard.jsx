import { Briefcase, Check, MapPin, Medal, Route, Wallet } from "lucide-react";
import { Button, Chip, ScoreBar } from "../../components/ui";
import { formatNumber, formatTrim } from "../../lib/format";

const MAX_GAPS_SHOWN = 3;

/** "Kota Yogyakarta (Cebongan, Ngestiharjo)" -> "Kota Yogyakarta" */
const shortLokasi = (lokasi) => lokasi.split("(")[0].trim();

/**
 * One ranked tempat magang. Rank 1 is set apart (dark surface, coral numeral).
 * Shown: rank, C1 as a percentage, chips, the gaps to work on. Ci is NOT shown
 * here (it is relative to the other lowongan; the detail page explains it).
 */
export default function RankingCard({ item, kotaAsal, motion }) {
  const top = item.rank === 1;
  const { values, flags } = item;
  const tone = top ? "ondark" : "sea";
  const gaps = item.kesenjangan;
  const shownGaps = gaps.slice(0, MAX_GAPS_SHOWN);

  const benefit =
    values.C5 === 0 && !flags.c5Imputasi ? "Rp 0/bln" : `Rp ${formatTrim(values.C5)} jt/bln`;

  return (
    <article
      aria-labelledby={`rek-${item.id}`}
      className={`${motion.className} rounded-card p-4 md:p-5 ${
        top ? "on-dark bg-sea-900 text-sand-100" : "border border-line bg-surface"
      }`}
      style={motion.style}
    >
      <div className="flex gap-4">
        <div className="w-14 shrink-0">
          <p
            aria-label={`Peringkat ${item.rank}`}
            className={`font-mono font-semibold leading-none ${top ? "text-5xl text-coral-400" : "text-4xl text-sea-700"}`}
          >
            {item.rank}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          {top && (
            <Chip tone="coral" icon={Medal} className="mb-2">
              Peringkat teratas
            </Chip>
          )}
          <h2 id={`rek-${item.id}`} className="font-display text-xl font-bold leading-snug">
            {item.namaPerusahaan}
          </h2>
          <p className={`mt-0.5 text-sm ${top ? "text-sea-100" : "text-muted"}`}>{item.posisi}</p>
        </div>
      </div>

      <ScoreBar
        label="Kecocokan kompetensi"
        value={values.C1}
        countUp
        onDark={top}
        className="mt-4"
      />

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Ringkasan tempat magang">
        <li>
          <Chip tone={tone} icon={Briefcase}>
            {item.bidang}
          </Chip>
        </li>
        <li>
          <Chip tone={top ? "ondark" : "outline"} icon={MapPin}>
            {shortLokasi(item.lokasi)}
          </Chip>
        </li>
        <li>
          <Chip tone={top ? "ondark" : "outline"} icon={Route}>
            <span className="font-mono">{formatNumber(values.C4, 0)} km</span>
            {kotaAsal && <span className="font-normal"> dari {kotaAsal}</span>}
          </Chip>
        </li>
        <li>
          <Chip tone={top ? "ondark" : "outline"} icon={Wallet}>
            {flags.c5Imputasi && <span aria-hidden="true">≈ </span>}
            <span className="font-mono">{benefit}</span>
            {flags.c5Imputasi && <span className="font-normal"> · perkiraan</span>}
          </Chip>
        </li>
      </ul>

      <div className="mt-3">
        {gaps.length === 0 ? (
          <p className={`flex items-center gap-1.5 text-sm font-medium ${top ? "text-sea-100" : "text-sea-800"}`}>
            <Check aria-hidden="true" size={16} strokeWidth={3} />
            Semua syarat kompetensinya sudah terpenuhi
          </p>
        ) : (
          <>
            <p className={`mb-1.5 text-sm ${top ? "text-sea-200" : "text-muted"}`}>Perlu ditingkatkan</p>
            <ul className="flex flex-wrap gap-1.5">
              {shownGaps.map((gap) => (
                <li key={gap.id}>
                  <Chip tone="coral">
                    {gap.nama}
                    {gap.levelMahasiswa === 0 ? (
                      <span className="font-normal"> · belum punya</span>
                    ) : (
                      <span className="font-mono"> −{Math.abs(gap.gap)}</span>
                    )}
                  </Chip>
                </li>
              ))}
              {gaps.length > MAX_GAPS_SHOWN && (
                <li>
                  <Chip tone={top ? "ondark" : "neutral"}>+{gaps.length - MAX_GAPS_SHOWN} lagi</Chip>
                </li>
              )}
            </ul>
          </>
        )}
      </div>

      <Button
        to={`/mahasiswa/rekomendasi/${item.id}`}
        variant={top ? "light" : "outline"}
        className="mt-4 w-full md:w-auto"
      >
        Lihat detail
      </Button>
    </article>
  );
}
