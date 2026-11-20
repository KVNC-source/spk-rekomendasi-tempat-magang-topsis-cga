import { ArrowLeft, BookmarkCheck, Briefcase, Info, MapPin, RefreshCw, SearchX, Sparkles, X } from "lucide-react";
import { useParams } from "react-router-dom";
import {
  ActionBar,
  Button,
  Card,
  Chip,
  CountUp,
  EmptyState,
  ScoreBar,
  Skeleton,
  Divider,
} from "../../components/ui";
import ElementTable from "../../features/rekomendasi/ElementTable";
import { useDetailRekomendasi } from "../../features/rekomendasi/useDetailRekomendasi";
import { formatNumber, formatTrim } from "../../lib/format";

const BACK = "/mahasiswa/rekomendasi";

/** Names and display of the seven criteria (C1–C7), in the order the engine uses. */
const KRITERIA = [
  { code: "C1", nama: "Kecocokan kompetensi", show: (v) => `${formatNumber(v, 1)}%` },
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

const shortLokasi = (lokasi) => lokasi.split("(")[0].trim();

function CgaSummary({ cga }) {
  const wajibSaja = cga.aturan === "WAJIB_SAJA";
  const rows = [
    { label: "Rata-rata skor wajib", value: formatNumber(cga.avgWajib, 2) },
    wajibSaja
      ? { label: "Rata-rata skor opsional", value: "tidak ada", plain: true }
      : { label: "Rata-rata skor opsional", value: formatNumber(cga.avgOpsional, 2) },
    { label: "Skor kompetensi", value: `${formatNumber(cga.sKomp, 2)} dari ${formatNumber(cga.sMaks, 1)}` },
  ];
  return (
    <>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink">
        {wajibSaja
          ? "Lowongan ini hanya mencantumkan kompetensi wajib, jadi skornya dihitung dari rata-rata skor kompetensi wajib saja."
          : `Skornya gabungan: kompetensi wajib berbobot ${formatNumber(cga.ncf * 100, 0)}% dan kompetensi opsional ${formatNumber(cga.nsf * 100, 0)}%.`}
      </p>
      <dl className="mt-3 divide-y divide-line rounded-ctl bg-mist-100 px-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-muted">{row.label}</dt>
            <dd className={row.plain ? "text-muted" : "font-mono font-semibold text-ink"}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Sedang memuat detail" className="space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <Card>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-5 h-16 w-full" />
      </Card>
      <Card>
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="mt-4 h-20 w-full" />
        <Skeleton className="mt-3 h-20 w-full" />
      </Card>
    </div>
  );
}

export default function DetailRekomendasi() {
  const { tempatId } = useParams();
  const detail = useDetailRekomendasi(tempatId);
  const { load, item, jumlah, pilihan, dipilih, aksi } = detail;
  const ready = load.status === "ready" && item;
  const saving = aksi.status === "saving";
  const lainnya = pilihan && !dipilih ? pilihan : null;

  const status = (() => {
    if (aksi.status === "error") return <span className="font-medium text-coral-700">{aksi.error}</span>;
    if (lainnya) {
      return `Pilihanmu sekarang: ${lainnya.namaPerusahaan}. Menyimpan ini akan menggantinya.`;
    }
    return null;
  })();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-48 pt-4 md:px-8 lg:max-w-4xl lg:pb-10 lg:pt-6">
      <Button to={BACK} variant="ghost" icon={ArrowLeft} className="-ml-3">
        Kembali ke rekomendasi
      </Button>

      {load.status === "loading" && (
        <div className="mt-4">
          <DetailSkeleton />
        </div>
      )}

      {load.status === "error" && (
        <EmptyState
          className="mt-4"
          variant="error"
          title="Detailnya belum bisa dimuat"
          description={`${load.error} Coba muat ulang. Kalau masih gagal, tunggu sebentar lalu coba lagi.`}
          action={
            <Button variant="secondary" icon={RefreshCw} onClick={detail.reload}>
              Muat ulang
            </Button>
          }
        />
      )}

      {load.status === "ready" && !detail.hasil && (
        <EmptyState
          className="mt-4"
          icon={Sparkles}
          title="Belum ada hasil rekomendasi"
          description="Detail ini muncul setelah rekomendasimu dihitung. Hitung dulu di halaman rekomendasi."
          action={
            <Button variant="secondary" to={BACK}>
              Ke rekomendasi
            </Button>
          }
        />
      )}

      {load.status === "ready" && detail.hasil && !item && (
        <EmptyState
          className="mt-4"
          icon={SearchX}
          title="Tempat magang ini tidak ada di hasilmu"
          description="Mungkin rekomendasimu sudah dihitung ulang dan daftarnya berubah. Buka lagi dari daftar rekomendasi."
          action={
            <Button variant="secondary" to={BACK}>
              Ke rekomendasi
            </Button>
          }
        />
      )}

      {ready && (
        <>
          <header className="mt-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Langkah 3 dari 3</p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-[1.05] text-ink md:text-4xl">
              {item.namaPerusahaan}
            </h1>
            <p className="mt-1.5 text-base text-muted">{item.posisi}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Ringkasan tempat magang">
              <li>
                <Chip tone="azure">
                  Peringkat <span className="font-mono">{item.rank}</span> dari <span className="font-mono">{jumlah}</span>
                </Chip>
              </li>
              <li>
                <Chip tone="navy" icon={Briefcase}>
                  {item.bidang}
                </Chip>
              </li>
              <li>
                <Chip tone="outline" icon={MapPin}>
                  {shortLokasi(item.lokasi)}
                </Chip>
              </li>
            </ul>
            <Divider className="mt-4 text-navy-400" />
          </header>

          <div className="mt-5 space-y-4">
            <Card as="section" aria-labelledby="sec-cga" className="motion-rise" style={{ "--i": 0 }}>
              <h2 id="sec-cga" className="font-display text-xl font-semibold leading-tight">
                Kecocokan kompetensi
              </h2>
              <ScoreBar label="Compatibility Score" value={item.cga.compatibilityScore} countUp className="mt-3" />
              <CgaSummary cga={item.cga} />
            </Card>

            <Card as="section" aria-labelledby="sec-elemen" className="motion-rise" style={{ "--i": 1 }}>
              <h2 id="sec-elemen" className="font-display text-xl font-semibold leading-tight">
                Rincian per kompetensi
              </h2>
              <p className="mt-1 max-w-prose text-sm text-muted">
                Skor 4,5 berarti levelmu melebihi kebutuhan. Skor makin kecil kalau levelmu di bawah kebutuhan.
              </p>
              <div className="mt-3">
                <ElementTable elements={item.cga.perElement} />
              </div>
            </Card>

            <Card as="section" aria-labelledby="sec-akhir" className="motion-rise" style={{ "--i": 2 }}>
              <h2 id="sec-akhir" className="font-display text-xl font-semibold leading-tight">
                Nilai akhir perbandingan
              </h2>
              <div className="mt-3 flex items-end gap-3">
                <p className="font-display text-5xl font-semibold leading-none text-navy-800">
                  <CountUp value={item.ci} digits={3} />
                </p>
                <p className="pb-1 text-sm text-muted">Ci, skala 0 sampai 1</p>
              </div>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink">
                Ini nilai relatif terhadap lowongan lain dalam daftar. Kalau daftarnya berubah, angkanya ikut berubah,
                jadi bukan persentase kecocokan.
              </p>
              <dl className="mt-3 divide-y divide-line rounded-ctl bg-mist-100 px-3 text-sm">
                <div className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="text-muted">Jarak ke solusi ideal (D⁺)</dt>
                  <dd className="font-mono font-semibold">{formatNumber(item.dPlus, 4)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="text-muted">Jarak ke solusi terburuk (D⁻)</dt>
                  <dd className="font-mono font-semibold">{formatNumber(item.dMinus, 4)}</dd>
                </div>
              </dl>

              <h3 className="mt-5 text-sm font-semibold text-ink">Nilai tiap kriteria</h3>
              <ul className="mt-1.5 divide-y divide-line">
                {KRITERIA.map((k) => {
                  const estimate = k.flag && item.flags[k.flag];
                  return (
                    <li key={k.code} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                      <span className="text-muted">
                        <span className="font-mono text-xs">{k.code}</span> {k.nama}
                      </span>
                      <span className="text-right font-mono font-semibold text-ink">
                        {estimate && <span aria-hidden="true">≈ </span>}
                        {k.show(item.values[k.code])}
                        {estimate && <span className="font-sans text-xs font-normal text-muted"> · perkiraan</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card tone="quiet" className="motion-rise flex gap-3" style={{ "--i": 3 }}>
              <Info aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-navy-700" />
              <p className="max-w-prose text-sm leading-relaxed text-ink">
                Rekomendasi ini membantumu menimbang, bukan menggantikan keputusanmu. “Simpan sebagai pilihan” hanya
                mencatat pilihanmu di sini. Persetujuan dari koordinator tetap kamu urus di luar sistem ini.
              </p>
            </Card>
          </div>

          <ActionBar status={status}>
            <Button
              size="lg"
              icon={BookmarkCheck}
              status={saving && !dipilih ? "loading" : dipilih ? "success" : "idle"}
              loadingLabel="Menyimpan…"
              successLabel="Jadi pilihanmu"
              onClick={dipilih ? undefined : detail.simpan}
              className="whitespace-nowrap"
            >
              Simpan sebagai pilihan
            </Button>
            {dipilih && (
              <Button
                variant="outline"
                size="lg"
                icon={X}
                status={saving ? "loading" : "idle"}
                loadingLabel="Membatalkan…"
                onClick={detail.batalkan}
                className="motion-pop whitespace-nowrap"
              >
                Batalkan pilihan
              </Button>
            )}
          </ActionBar>
        </>
      )}
    </div>
  );
}
