import { BookmarkCheck, Check, FilePen, RefreshCw, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ScoreBar,
  SegmentedProgress,
  Skeleton,
} from "../../components/ui";
import { useAuth } from "../../features/auth/useAuth";
import { TUJUAN } from "../../features/beranda/langkahBerikutnya";
import { useBeranda } from "../../features/beranda/useBeranda";
import KompetensiPrioritas from "../../features/rekomendasi/KompetensiPrioritas";

const MAKS_TERATAS = 3;
const MAKS_PRIORITAS = 3;

const tautan = "inline-flex min-h-11 items-center font-semibold text-navy-800 underline underline-offset-4";
const labelKecil = "font-mono text-xs uppercase tracking-[0.18em]";

/** "Kota Yogyakarta (Cebongan, Ngestiharjo)" -> "Kota Yogyakarta" */
const kotaSaja = (lokasi) => lokasi.split("(")[0].trim();

/** The existing stale warning, in one line, for the places that show numbers from an older calculation. */
function PenandaBasi({ children }) {
  return (
    <p role="status" className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-coral-700">
      <TriangleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

function BerandaSkeleton() {
  return (
    <div role="status" aria-label="Sedang memuat berandamu" className="space-y-4">
      <div className="rounded-card bg-navy-900 p-5 md:p-6">
        <Skeleton className="h-3 w-32 bg-navy-800" />
        <Skeleton className="mt-3 h-8 w-3/4 bg-navy-800" />
        <Skeleton className="mt-3 h-4 w-full bg-navy-800" />
        <Skeleton className="mt-5 h-12 w-48 bg-navy-800" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-4 h-6 w-2/3" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function LangkahBerikutnya({ langkah }) {
  return (
    <section
      aria-labelledby="langkah"
      className="on-dark motion-rise rounded-card bg-navy-900 px-5 py-6 text-mist-100 md:px-8 md:py-8"
      style={{ "--i": 1 }}
    >
      <p className={`${labelKecil} text-navy-200`}>Langkah berikutnya</p>
      <h2 id="langkah" className="mt-2 font-display text-2xl font-semibold leading-tight md:text-3xl">
        {langkah.judul}
      </h2>
      <p className="mt-2 max-w-xl text-base leading-relaxed text-navy-100">{langkah.keterangan}</p>
      <Button to={langkah.tombol.ke} size="lg" className="mt-5 w-full sm:w-auto">
        {langkah.tombol.label}
      </Button>
    </section>
  );
}

function KelengkapanProfil({ profil, kelengkapan }) {
  const lengkap = profil?.status === "Lengkap";
  return (
    <Card as="section" aria-labelledby="kelengkapan" className="motion-rise" style={{ "--i": 2 }}>
      <div className="flex items-start justify-between gap-3">
        <h2 id="kelengkapan" className="font-display text-lg font-semibold leading-tight text-ink">
          Kelengkapan profil
        </h2>
        <Chip tone={lengkap ? "navy" : "neutral"} icon={lengkap ? Check : FilePen}>
          {lengkap ? "Lengkap" : "Draf"}
        </Chip>
      </div>

      <p className="mt-3 text-sm text-muted">
        <span className="font-mono text-3xl font-semibold text-ink">{kelengkapan.persen}%</span>{" "}
        <span className="font-mono">{kelengkapan.terisi}</span> dari <span className="font-mono">{kelengkapan.total}</span>{" "}
        kompetensi terisi
      </p>
      <SegmentedProgress done={kelengkapan.terisi} total={kelengkapan.total} label="Kelengkapan profil kompetensi" />

      <p className="mt-4 text-sm text-muted">Data pendukung</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {kelengkapan.data.map((d) => (
          <li key={d.kunci}>
            <Chip tone={d.terisi ? "navy" : "outline"} icon={d.terisi ? Check : undefined}>
              {d.nama}
              {!d.terisi && <span className="font-normal"> · belum diisi</span>}
            </Chip>
          </li>
        ))}
      </ul>

      <Link to={TUJUAN.profil} className={`${tautan} mt-2`}>
        Buka profil kompetensi
      </Link>
    </Card>
  );
}

function PilihanTersimpan({ pilihan, item, jumlah, basi }) {
  if (!pilihan) {
    return (
      <EmptyState
        icon={BookmarkCheck}
        title="Belum ada pilihan"
        description="Tempat magang yang kamu simpan dari daftar rekomendasi akan tampil di sini."
        action={
          <Button variant="secondary" to={TUJUAN.rekomendasi}>
            Lihat rekomendasi
          </Button>
        }
      />
    );
  }
  return (
    <Card as="section" aria-labelledby="pilihan-nama" className="motion-rise" style={{ "--i": 3 }}>
      <Chip tone="navy" icon={BookmarkCheck} className="mb-2">
        Pilihanmu
      </Chip>
      <h2 id="pilihan-nama" className="font-display text-xl font-semibold leading-snug text-ink">
        {pilihan.namaPerusahaan}
      </h2>
      <p className="mt-0.5 text-sm text-muted">
        {pilihan.posisi}
        {item && <span> · {kotaSaja(item.lokasi)}</span>}
      </p>

      {item ? (
        <>
          <ScoreBar label="Kesesuaian kompetensi" value={item.values.C1} className="mt-4" />
          <p className="mt-2 text-sm text-muted">
            Peringkat <span className="font-mono">{item.rank}</span> dari <span className="font-mono">{jumlah}</span>
          </p>
          {basi && <PenandaBasi>Angka ini dari perhitungan terakhir. Hitung ulang untuk hasil terbaru.</PenandaBasi>}
        </>
      ) : (
        <p className="mt-3 max-w-prose rounded-ctl bg-mist-100 p-3 text-sm leading-relaxed text-ink">
          Skor kesesuaiannya belum bisa ditampilkan karena rekomendasimu belum dihitung, atau hasil barunya sudah tidak
          memuat tempat magang ini.
        </p>
      )}

      <Link to={TUJUAN.pilihan} className={`${tautan} mt-2`}>
        Buka pilihanmu
      </Link>
    </Card>
  );
}

function RekomendasiTeratas({ hasil, basi }) {
  const teratas = hasil.ranking.slice(0, MAKS_TERATAS);
  return (
    <Card as="section" aria-labelledby="teratas" className="motion-rise" style={{ "--i": 4 }}>
      <h2 id="teratas" className="font-display text-lg font-semibold leading-tight text-ink">
        Rekomendasi teratas
      </h2>
      {basi && <PenandaBasi>Data berubah sejak perhitungan terakhir. Hitung ulang untuk hasil terbaru.</PenandaBasi>}

      <ol className="mt-3 divide-y divide-line">
        {teratas.map((item) => (
          <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span aria-hidden="true" className="w-6 shrink-0 font-mono text-2xl font-semibold leading-none text-navy-700">
              {item.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-snug text-ink">
                <span className="sr-only">Peringkat {item.rank}: </span>
                {item.namaPerusahaan}
              </p>
              <p className="text-sm text-muted">{item.posisi}</p>
              <ScoreBar label="Kesesuaian kompetensi" value={item.values.C1} className="mt-2" />
            </div>
          </li>
        ))}
      </ol>

      <Link to={TUJUAN.rekomendasi} className={`${tautan} mt-2`}>
        Lihat semua
      </Link>
    </Card>
  );
}

export default function Beranda() {
  const { user } = useAuth();
  const b = useBeranda();
  const loaded = b.load.status === "ready";

  const diri = b.profil?.mahasiswa ?? user;
  const angkatan = b.profil?.mahasiswa?.angkatan;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 md:px-8 lg:max-w-4xl lg:pb-10 lg:pt-8">
      <header>
        <h1 className="motion-rise font-display text-3xl font-semibold leading-[1.05] text-ink md:text-4xl" style={{ "--i": 0 }}>
          Halo, {diri.nama}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {diri.nim && (
            <>
              NIM <span className="font-mono">{diri.nim}</span>
            </>
          )}
          {diri.nim && angkatan && <span aria-hidden="true"> · </span>}
          {angkatan && (
            <>
              Angkatan <span className="font-mono">{angkatan}</span>
            </>
          )}
        </p>
        <Divider className="mt-3 text-navy-400" />
      </header>

      <div className="mt-5 space-y-4">
        {b.load.status === "loading" && <BerandaSkeleton />}

        {b.load.status === "error" && (
          <EmptyState
            variant="error"
            title="Berandamu belum bisa dimuat"
            description={`${b.load.error} Coba muat ulang. Kalau masih gagal, tunggu sebentar lalu coba lagi.`}
            action={
              <Button variant="secondary" icon={RefreshCw} onClick={b.reload}>
                Muat ulang
              </Button>
            }
          />
        )}

        {loaded && (
          <>
            <LangkahBerikutnya langkah={b.langkah} />

            <div className="grid items-start gap-4 lg:grid-cols-2">
              <KelengkapanProfil profil={b.profil} kelengkapan={b.kelengkapan} />
              <PilihanTersimpan
                pilihan={b.pilihan}
                item={b.item}
                jumlah={b.hasil?.ranking.length ?? 0}
                basi={b.basi}
              />
            </div>

            {b.hasil && (
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <RekomendasiTeratas hasil={b.hasil} basi={b.basi} />
                <KompetensiPrioritas
                  ringkasan={b.hasil.ringkasanKesenjangan}
                  stale={b.basi}
                  maks={MAKS_PRIORITAS}
                  tautan={{ ke: TUJUAN.rekomendasi, label: "Lihat di rekomendasi" }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
