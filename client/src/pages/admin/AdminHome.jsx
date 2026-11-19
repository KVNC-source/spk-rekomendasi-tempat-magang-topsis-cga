import { useCallback } from "react";
import { ClipboardList, Landmark, RefreshCw, Scale, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { getKompetensiAdmin, getKriteria, getTempatList } from "../../api/admin";
import { Button, Card, EmptyState, Skeleton, StatCard, WaveLine } from "../../components/ui";
import { useLoad } from "../../features/admin/useLoad";
import { formatNumber } from "../../lib/format";

export default function AdminHome() {
  const load = useCallback(
    () => Promise.all([getTempatList(), getKompetensiAdmin(), getKriteria()]).then(([tempat, kompetensi, kriteria]) => ({ tempat, kompetensi, kriteria })),
    [],
  );
  const { status, data, error, reload } = useLoad(load);

  const dipakai = data?.tempat.filter((t) => t.status_alternatif === "Dipakai").length ?? 0;
  const dikeluarkan = (data?.tempat.length ?? 0) - dipakai;
  const total = data?.kriteria.total;
  const totalBenar = total === 1;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 md:px-8 lg:pt-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold leading-[1.05] text-ink md:text-4xl">Data referensi</h1>
        <p className="mt-2 max-w-prose text-base text-muted">
          Yang kamu ubah di sini dipakai perhitungan rekomendasi berikutnya.
        </p>
        <WaveLine className="mt-4 text-sea-400" />
      </header>

      {status === "loading" && (
        <div role="status" aria-label="Sedang memuat ringkasan" className="mt-5 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-3 h-8 w-1/3" />
            </Card>
          ))}
        </div>
      )}

      {status === "error" && (
        <EmptyState
          className="mt-5"
          variant="error"
          title="Ringkasan belum bisa dimuat"
          description={`${error} Coba muat ulang. Kalau masih gagal, tunggu sebentar lalu coba lagi.`}
          action={
            <Button variant="secondary" icon={RefreshCw} onClick={reload}>
              Muat ulang
            </Button>
          }
        />
      )}

      {status === "ready" && (
        <div className="mt-5 space-y-4">
          {!totalBenar && (
            <Card className="flex gap-3 border-coral-300 bg-coral-50" role="alert">
              <TriangleAlert aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-coral-700" />
              <p className="max-w-prose text-sm leading-relaxed text-ink">
                Total bobot kriteria sekarang <span className="font-mono">{formatNumber(total, 2)}</span>, bukan 1,00.
                Perhitungan rekomendasi akan gagal sampai bobotnya dibetulkan.
              </p>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Tempat magang dipakai"
              value={dipakai}
              hint={`${dikeluarkan} dikeluarkan dari perhitungan`}
              icon={Landmark}
            />
            <StatCard label="Kompetensi" value={data.kompetensi.length} hint="Skala level 0 sampai 4" icon={ClipboardList} />
            <StatCard
              label="Total bobot kriteria"
              value={formatNumber(total, 2)}
              hint={totalBenar ? "Tepat 1,00. Sementara, menunggu validasi pakar." : "Harus tepat 1,00"}
              icon={Scale}
            />
          </div>

          <ul className="grid gap-4 md:grid-cols-3">
            {[
              { to: "/admin/tempat", title: "Kelola tempat magang", text: "Tambah, ubah, atau keluarkan lowongan beserta kebutuhan kompetensinya." },
              { to: "/admin/kompetensi", title: "Kelola kompetensi", text: "Nama, kategori, dan deskripsi kompetensi yang diisi mahasiswa." },
              { to: "/admin/kriteria", title: "Atur bobot kriteria", text: "Bobot C1 sampai C7 untuk perbandingan TOPSIS." },
            ].map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="press block h-full rounded-card border border-line bg-surface p-4 hover:border-line-strong md:p-5"
                >
                  <span className="font-display text-xl font-bold text-ink">{item.title}</span>
                  <span className="mt-1 block text-sm text-muted">{item.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
