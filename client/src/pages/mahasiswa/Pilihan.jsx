import { BookmarkCheck, Check, ExternalLink, Info, Printer, RefreshCw, X } from "lucide-react";
import { Button, Card, Chip, EmptyState, RelativeTime, ScoreBar, Skeleton, Divider } from "../../components/ui";
import { alasanCetakNonaktif } from "../../features/rekomendasi/alasanCetak";
import RingkasanCetak from "../../features/rekomendasi/RingkasanCetak";
import { usePilihan } from "../../features/rekomendasi/usePilihan";
import { formatDate } from "../../lib/format";

const REKOMENDASI = "/mahasiswa/rekomendasi";
const MAX_GAPS_SHOWN = 3;

/** Only http(s) links are opened; anything else in the data is shown as "not recorded". */
const safeUrl = (url) => (typeof url === "string" && /^https?:\/\//i.test(url) ? url : null);

function PilihanSkeleton() {
  return (
    <Card role="status" aria-label="Sedang memuat pilihanmu">
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-5 h-3 w-full" />
      <Skeleton className="mt-4 h-6 w-2/3" />
    </Card>
  );
}

export default function Pilihan() {
  const { load, pilihan, item, jumlah, hasil, profil, aksi, batalkan, reload } = usePilihan();
  const loaded = load.status === "ready";
  const saving = aksi.status === "saving";
  const url = safeUrl(pilihan?.sumberUrl);
  const gaps = item?.kesenjangan ?? [];
  // The summary can only be printed while the result is fresh (its weights are then the ones used).
  const alasanCetak = alasanCetakNonaktif({ pilihan, hasil, item, profil });

  return (
    <>
    <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 md:px-8 lg:max-w-4xl lg:pb-10 lg:pt-8 print:hidden">
      <header>
        <h1 className="font-display text-3xl font-semibold leading-[1.05] text-ink md:text-4xl">Pilihanmu</h1>
        <div className="mt-2 text-base text-muted">
          {!loaded && load.status === "loading" && <Skeleton className="h-6 w-48" />}
          {loaded && pilihan && (
            <>
              Disimpan <RelativeTime value={pilihan.disimpan_pada} />
            </>
          )}
          {loaded && !pilihan && "Tempat magang yang kamu simpan akan tampil di sini."}
        </div>
        <Divider className="mt-4 text-navy-400" />
      </header>

      <div className="mt-5 space-y-4">
        {load.status === "loading" && <PilihanSkeleton />}

        {load.status === "error" && (
          <EmptyState
            variant="error"
            title="Pilihanmu belum bisa dimuat"
            description={`${load.error} Coba muat ulang. Kalau masih gagal, tunggu sebentar lalu coba lagi.`}
            action={
              <Button variant="secondary" icon={RefreshCw} onClick={reload}>
                Muat ulang
              </Button>
            }
          />
        )}

        {loaded && !pilihan && (
          <EmptyState
            icon={BookmarkCheck}
            title="Belum ada pilihan"
            description="Buka salah satu tempat magang di daftar rekomendasi, lalu tekan “Simpan sebagai pilihan”."
            action={
              <Button variant="secondary" to={REKOMENDASI}>
                Lihat rekomendasi
              </Button>
            }
          />
        )}

        {loaded && pilihan && (
          <>
            <Card as="article" aria-labelledby="pilihan-nama" className="motion-rise">
              <Chip tone="navy" icon={BookmarkCheck} className="mb-2">
                Pilihanmu
              </Chip>
              <h2 id="pilihan-nama" className="font-display text-2xl font-semibold leading-snug">
                {pilihan.namaPerusahaan}
              </h2>
              <p className="mt-0.5 text-base text-muted">{pilihan.posisi}</p>

              {item ? (
                <>
                  <ScoreBar label="Kesesuaian kompetensi" value={item.values.C1} countUp className="mt-4" />
                  <p className="mt-2 text-sm text-muted">
                    Peringkat <span className="font-mono">{item.rank}</span> dari{" "}
                    <span className="font-mono">{jumlah}</span> di rekomendasi terakhirmu
                  </p>

                  <div className="mt-4">
                    {gaps.length === 0 ? (
                      <p className="flex items-center gap-1.5 text-sm font-medium text-navy-800">
                        <Check aria-hidden="true" size={16} strokeWidth={3} />
                        Semua syarat kompetensinya sudah terpenuhi
                      </p>
                    ) : (
                      <>
                        <p className="mb-1.5 text-sm text-muted">Perlu ditingkatkan</p>
                        <ul className="flex flex-wrap gap-1.5">
                          {gaps.slice(0, MAX_GAPS_SHOWN).map((gap) => (
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
                              <Chip tone="neutral">+{gaps.length - MAX_GAPS_SHOWN} lagi</Chip>
                            </li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-4 max-w-prose rounded-ctl bg-mist-100 p-3 text-sm leading-relaxed text-ink">
                  Skor kesesuaiannya belum bisa ditampilkan karena rekomendasimu belum dihitung, atau hasil barunya sudah
                  tidak memuat tempat magang ini.
                </p>
              )}

              <div className="mt-4 border-t border-line pt-3 text-sm">
                <p className="text-muted">Sumber lowongan</p>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press mt-1 inline-flex min-h-11 items-center gap-1.5 font-semibold text-navy-800 underline underline-offset-4"
                  >
                    Lihat lowongan asli
                    <ExternalLink aria-hidden="true" size={16} />
                    <span className="sr-only">(buka di tab baru)</span>
                  </a>
                ) : (
                  <p className="mt-1 text-ink">Tautan sumbernya belum tercatat.</p>
                )}
                <p className="text-muted">
                  Diakses pada <span className="font-mono">{formatDate(pilihan.tanggalAkses)}</span>. Isi lowongannya
                  bisa sudah berubah.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {item && (
                  <Button to={`${REKOMENDASI}/${item.id}`} variant="secondary">
                    Lihat detail kesesuaian
                  </Button>
                )}
                <Button
                  variant="outline"
                  icon={X}
                  status={saving ? "loading" : "idle"}
                  loadingLabel="Membatalkan…"
                  onClick={batalkan}
                >
                  Batalkan pilihan
                </Button>
                <Button
                  variant="outline"
                  icon={Printer}
                  disabled={alasanCetak !== null}
                  aria-describedby={alasanCetak ? "alasan-cetak" : undefined}
                  onClick={() => window.print()}
                >
                  Cetak / Simpan PDF
                </Button>
              </div>
              {alasanCetak && (
                <p id="alasan-cetak" className="mt-2 text-sm text-muted">
                  {alasanCetak}
                </p>
              )}
              {aksi.status === "error" && (
                <p role="alert" className="mt-3 text-sm font-medium text-coral-700">
                  {aksi.error}
                </p>
              )}
            </Card>

            <Card tone="quiet" className="motion-rise flex gap-3" style={{ "--i": 1 }}>
              <Info aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-navy-700" />
              <p className="max-w-prose text-sm leading-relaxed text-ink">
                Ini hanya catatan pilihanmu di sini. Persetujuan dari koordinator tetap kamu urus di luar sistem, dan
                kamu boleh mengganti pilihan kapan saja.
              </p>
            </Card>
          </>
        )}
      </div>
    </div>

    {/* Print-only: nothing here shows on screen. Without a fresh result it prints just the reason. */}
    {loaded && pilihan && (
      <div className="hidden print:block">
        {alasanCetak ? (
          <p className="text-[11pt] text-black">{alasanCetak}</p>
        ) : (
          <RingkasanCetak mahasiswa={profil.mahasiswa} pilihan={pilihan} item={item} jumlah={jumlah} hasil={hasil} />
        )}
      </div>
    )}
    </>
  );
}
