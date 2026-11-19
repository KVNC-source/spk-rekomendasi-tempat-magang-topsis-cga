import { useEffect, useRef, useState } from "react";
import { ClipboardList, Info, ListFilter, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import {
  ActionBar,
  Button,
  Card,
  Chip,
  EmptyState,
  RelativeTime,
  Skeleton,
  WaveLine,
} from "../../components/ui";
import FilterSheet from "../../features/rekomendasi/FilterSheet";
import RankingCard from "../../features/rekomendasi/RankingCard";
import RankingSkeleton from "../../features/rekomendasi/RankingSkeleton";
import TidakIkutDihitung from "../../features/rekomendasi/TidakIkutDihitung";
import { useRekomendasi } from "../../features/rekomendasi/useRekomendasi";

const FILTER_KEY = "spk-magang:filter-rekomendasi";
const MAX_ANIMATED = 8;
const DONE_MS = 2200;

function readFilter() {
  try {
    const value = JSON.parse(window.localStorage.getItem(FILTER_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeFilter(value) {
  try {
    window.localStorage.setItem(FILTER_KEY, JSON.stringify(value));
  } catch {
    /* private mode: the filter just is not remembered */
  }
}

export default function Rekomendasi() {
  const rek = useRekomendasi();
  const { load, hasil, calc, profil } = rek;
  const [filter, setFilter] = useState(readFilter);
  const [filterOpen, setFilterOpen] = useState(false);
  const [done, setDone] = useState(false);
  const doneTimer = useRef(null);
  // Cards animate in only the first time a result appears (and after a recalculation).
  const [animate, setAnimate] = useState(true);

  useEffect(() => () => clearTimeout(doneTimer.current), []);
  useEffect(() => {
    if (!hasil) return undefined;
    const timer = setTimeout(() => setAnimate(false), 1200);
    return () => clearTimeout(timer);
  }, [hasil]);

  const ranking = hasil?.ranking ?? [];
  const bidangOptions = Object.entries(
    ranking.reduce((acc, r) => ({ ...acc, [r.bidang]: (acc[r.bidang] ?? 0) + 1 }), {}),
  )
    .map(([bidang, jumlah]) => ({ bidang, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah || a.bidang.localeCompare(b.bidang, "id"));
  const activeFilter = filter.filter((b) => bidangOptions.some((o) => o.bidang === b));
  const shown = activeFilter.length ? ranking.filter((r) => activeFilter.includes(r.bidang)) : ranking;

  const changeFilter = (next) => {
    setFilter(next);
    writeFilter(next);
  };

  const motionFor = (item, index) => {
    if (!animate || index >= MAX_ANIMATED) return { className: "", style: undefined };
    // The top card settles last, and slightly slower.
    if (item.rank === 1) {
      return { className: "motion-rise-slow", style: { "--i": Math.min(shown.length, MAX_ANIMATED) } };
    }
    return { className: "motion-rise", style: { "--i": index } };
  };

  const handleHitung = async () => {
    setAnimate(true);
    const result = await rek.hitung();
    if (result.ok) {
      setDone(true);
      clearTimeout(doneTimer.current);
      doneTimer.current = setTimeout(() => setDone(false), DONE_MS);
    }
  };

  const computing = calc.status === "computing";
  const buttonStatus = computing ? "loading" : done ? "success" : "idle";
  const loaded = load.status === "ready";
  const showBar = loaded && (hasil || rek.profilLengkap);
  const kotaAsal = profil?.domisili?.kota;

  const incompleteText = `Tinggal melengkapi ${rek.dataKurang.join(", ")} di profilmu, lalu rekomendasimu bisa dihitung.`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-48 pt-6 md:px-8 lg:max-w-4xl lg:pb-10 lg:pt-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Langkah 2 dari 3</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] text-ink md:text-4xl">
          Rekomendasi Tempat Magang
        </h1>
        <div className="mt-2 text-base text-muted">
          {!loaded && <Skeleton className="h-6 w-56" />}
          {loaded && hasil && (
            <>
              Dihitung <RelativeTime value={hasil.dihitungPada} />
              <span aria-hidden="true"> · </span>
              <span className="font-mono">{ranking.length}</span> tempat magang dibandingkan
            </>
          )}
          {loaded && !hasil && "Urutan tempat magang yang paling cocok dengan profilmu."}
        </div>
        <WaveLine className="mt-4 text-sea-400" />
      </header>

      <Card tone="quiet" className="mt-5 flex gap-3">
        <Info aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-sea-700" />
        <p className="max-w-prose text-sm leading-relaxed text-ink">
          Rekomendasi ini membantumu menimbang pilihan, bukan menggantikan keputusanmu. Kamu yang memutuskan, dan
          tempat magang di luar urutan teratas tetap boleh kamu pilih.
        </p>
      </Card>

      <div className="mt-5 space-y-4">
        {load.status === "loading" && <RankingSkeleton label="Sedang memuat rekomendasimu" count={3} />}

        {load.status === "error" && (
          <EmptyState
            variant="error"
            title="Rekomendasimu belum bisa dimuat"
            description={`${load.error} Coba muat ulang. Kalau masih gagal, tunggu sebentar lalu coba lagi.`}
            action={
              <Button variant="secondary" icon={RefreshCw} onClick={rek.reload}>
                Muat ulang
              </Button>
            }
          />
        )}

        {loaded && !hasil && !rek.profilLengkap && (
          <EmptyState
            icon={ClipboardList}
            title="Belum ada rekomendasi"
            description={incompleteText}
            action={
              <Button variant="secondary" to="/mahasiswa/profil">
                Lengkapi profil
              </Button>
            }
          />
        )}

        {loaded && !hasil && rek.profilLengkap && !computing && calc.status !== "error" && (
          <EmptyState
            icon={Sparkles}
            title="Profilmu sudah lengkap"
            description="Tekan “Minta rekomendasi” di bawah. Mesin akan membandingkan profilmu dengan semua tempat magang yang tersedia."
          />
        )}

        {calc.status === "error" && (
          <EmptyState
            variant="error"
            title="Perhitungan belum berhasil"
            description={`${calc.error}${calc.belumDiisi.length ? " Masih ada elemen kompetensi yang belum kamu jawab." : " Coba lagi sebentar lagi."}`}
            action={
              calc.belumDiisi.length ? (
                <Button variant="secondary" to={`/mahasiswa/profil?fokus=${calc.belumDiisi[0]}`}>
                  Lengkapi profil
                </Button>
              ) : (
                <Button variant="secondary" icon={RefreshCw} onClick={handleHitung}>
                  Coba lagi
                </Button>
              )
            }
          />
        )}

        {computing && <RankingSkeleton count={4} />}

        {loaded && hasil && !computing && (
          <>
            {rek.stale && (
              <Card className="motion-pop flex gap-3 border-coral-300 bg-coral-50">
                <TriangleAlert aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-coral-700" />
                <p className="max-w-prose text-sm leading-relaxed text-ink">
                  Profilmu berubah sejak perhitungan terakhir. Hitung ulang supaya urutannya sesuai dengan profilmu
                  yang sekarang.
                </p>
              </Card>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">
                Menampilkan <span className="font-mono">{shown.length}</span> dari{" "}
                <span className="font-mono">{ranking.length}</span>
              </p>
              <Button variant="outline" icon={ListFilter} onClick={() => setFilterOpen(true)}>
                Filter
                {activeFilter.length > 0 && (
                  <Chip tone="sea" className="ml-0.5">
                    <span className="font-mono">{activeFilter.length}</span>
                  </Chip>
                )}
              </Button>
            </div>

            {shown.length === 0 ? (
              <EmptyState
                title="Tidak ada yang cocok dengan filter"
                description="Belum ada tempat magang di bidang yang kamu pilih. Coba bidang lain, atau hapus filternya."
                action={
                  <Button variant="secondary" onClick={() => changeFilter([])}>
                    Hapus filter
                  </Button>
                }
              />
            ) : (
              <ol className="space-y-4">
                {shown.map((item, index) => (
                  <li key={item.id}>
                    <RankingCard
                      item={item}
                      kotaAsal={kotaAsal}
                      motion={motionFor(item, index)}
                    />
                  </li>
                ))}
              </ol>
            )}

            <TidakIkutDihitung excluded={hasil.excluded} />
          </>
        )}
      </div>

      {showBar && (
        <ActionBar
          status={
            rek.stale && !computing
              ? "Profilmu berubah sejak perhitungan terakhir."
              : computing
                ? "Mesin sedang membandingkan profilmu…"
                : null
          }
        >
          <Button
            size="lg"
            icon={hasil ? RefreshCw : Sparkles}
            status={buttonStatus}
            loadingLabel="Menghitung…"
            successLabel="Selesai"
            onClick={handleHitung}
            className="whitespace-nowrap"
          >
            {hasil ? "Hitung ulang" : "Minta rekomendasi"}
          </Button>
        </ActionBar>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        options={bidangOptions}
        selected={activeFilter}
        onChange={changeFilter}
      />
    </div>
  );
}
