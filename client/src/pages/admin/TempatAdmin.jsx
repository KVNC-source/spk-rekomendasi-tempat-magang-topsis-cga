import { useMemo, useState } from "react";
import { Check, MapPin, Plus, RefreshCw, SearchX } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getTempatList, hapusTempat } from "../../api/admin";
import { BottomSheet, Button, Card, Chip, EmptyState, SelectField, Skeleton, TextField, Divider } from "../../components/ui";
import { useLoad } from "../../features/admin/useLoad";

const cocok = (t, kata) =>
  [t.kode_tempat, t.nama_perusahaan, t.posisi, t.lokasi, t.bidang_industri].some((teks) => teks.toLowerCase().includes(kata));

export default function TempatAdmin() {
  const { status, data, error, reload, refresh } = useLoad(getTempatList);
  const location = useLocation();
  const [pesan, setPesan] = useState(location.state?.pesan ?? null);
  const [cari, setCari] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBidang, setFilterBidang] = useState("");
  const [hapus, setHapus] = useState(null); // the tempat being confirmed for deletion
  const [deleting, setDeleting] = useState(false);
  const [galatHapus, setGalatHapus] = useState(null);

  const bidangAda = useMemo(() => [...new Set((data ?? []).map((t) => t.bidang_industri))].sort((a, b) => a.localeCompare(b, "id")), [data]);
  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    return (data ?? []).filter(
      (t) => (!kata || cocok(t, kata)) && (!filterStatus || t.status_alternatif === filterStatus) && (!filterBidang || t.bidang_industri === filterBidang),
    );
  }, [data, cari, filterStatus, filterBidang]);

  const konfirmasiHapus = async () => {
    setDeleting(true);
    setGalatHapus(null);
    try {
      await hapusTempat(hapus.kode_tempat);
      setPesan(`${hapus.kode_tempat} · ${hapus.nama_perusahaan} dihapus.`);
      setHapus(null);
      refresh();
    } catch (err) {
      setGalatHapus(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 md:px-8 lg:pt-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold leading-[1.05] text-ink md:text-4xl">Tempat magang</h1>
          <p className="mt-2 max-w-prose text-base text-muted">
            Lowongan yang dibandingkan untuk mahasiswa, lengkap dengan kompetensi yang dibutuhkannya.
          </p>
        </div>
        <Button to="/admin/tempat/baru" icon={Plus}>
          Tambah tempat
        </Button>
      </header>
      <Divider className="mt-4 text-navy-400" />

      {pesan && (
        <p role="status" className="motion-pop mt-4 flex items-center gap-2 rounded-ctl bg-navy-100 px-4 py-3 text-sm font-semibold text-navy-900">
          <Check aria-hidden="true" size={16} strokeWidth={3} />
          {pesan}
        </p>
      )}

      {status === "ready" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_14rem]">
          <TextField id="cari" label="Cari" type="search" placeholder="Nama, posisi, kode, atau lokasi" value={cari} onChange={(e) => setCari(e.target.value)} autoComplete="off" />
          <SelectField id="filter-status" label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Semua</option>
            <option value="Dipakai">Dipakai</option>
            <option value="Dikeluarkan">Dikeluarkan</option>
          </SelectField>
          <SelectField id="filter-bidang" label="Bidang" value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)}>
            <option value="">Semua</option>
            {bidangAda.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </SelectField>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {status === "loading" && (
          <div role="status" aria-label="Sedang memuat tempat magang" className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3 h-4 w-1/2" />
              </Card>
            ))}
          </div>
        )}

        {status === "error" && (
          <EmptyState
            variant="error"
            title="Daftar tempat magang belum bisa dimuat"
            description={`${error} Coba muat ulang. Kalau masih gagal, tunggu sebentar lalu coba lagi.`}
            action={
              <Button variant="secondary" icon={RefreshCw} onClick={reload}>
                Muat ulang
              </Button>
            }
          />
        )}

        {status === "ready" && data.length === 0 && (
          <EmptyState
            title="Belum ada tempat magang"
            description="Tambahkan lowongan pertama beserta kompetensi yang dibutuhkannya."
            action={
              <Button variant="secondary" to="/admin/tempat/baru">
                Tambah tempat
              </Button>
            }
          />
        )}

        {status === "ready" && data.length > 0 && tampil.length === 0 && (
          <EmptyState
            icon={SearchX}
            title="Tidak ada yang cocok"
            description="Coba kata kunci lain, atau hapus filternya."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setCari("");
                  setFilterStatus("");
                  setFilterBidang("");
                }}
              >
                Hapus filter
              </Button>
            }
          />
        )}

        {status === "ready" && tampil.length > 0 && (
          <>
            <p className="text-sm text-muted">
              Menampilkan <span className="font-mono">{tampil.length}</span> dari <span className="font-mono">{data.length}</span>
            </p>
            <ul className="space-y-3">
              {tampil.map((t) => (
                <li key={t.kode_tempat}>
                  <Card as="article" aria-labelledby={`tempat-${t.kode_tempat}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-navy-800">{t.kode_tempat}</span>
                          <Chip tone={t.status_alternatif === "Dipakai" ? "navy" : "neutral"}>{t.status_alternatif}</Chip>
                        </p>
                        <h2 id={`tempat-${t.kode_tempat}`} className="mt-1 font-display text-xl font-semibold leading-snug">
                          {t.nama_perusahaan}
                        </h2>
                        <p className="text-sm text-muted">{t.posisi}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button to={`/admin/tempat/${t.kode_tempat}`} variant="outline" aria-label={`Ubah ${t.nama_perusahaan}, ${t.posisi}`}>
                          Ubah
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setHapus(t);
                            setGalatHapus(null);
                          }}
                          aria-label={`Hapus ${t.nama_perusahaan}, ${t.posisi}`}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Ringkasan">
                      <li>
                        <Chip tone="navy">{t.bidang_industri}</Chip>
                      </li>
                      <li>
                        <Chip tone="outline" icon={MapPin}>
                          {t.lokasi.split("(")[0].trim()}
                        </Chip>
                      </li>
                      <li>
                        <Chip tone="outline">
                          <span className="font-mono">{t.jumlah_wajib}</span> wajib · <span className="font-mono">{t.jumlah_opsional}</span> opsional
                        </Chip>
                      </li>
                      {t.latitude === null && (
                        <li>
                          <Chip tone="coral">Tanpa koordinat</Chip>
                        </li>
                      )}
                    </ul>
                    {t.status_alternatif === "Dikeluarkan" && t.alasan_dikeluarkan && (
                      <p className="mt-2 max-w-prose text-sm text-muted">Alasan: {t.alasan_dikeluarkan}</p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <BottomSheet open={hapus !== null} onClose={() => setHapus(null)} title="Hapus tempat magang">
        {hapus && (
          <div className="space-y-4">
            <p className="text-base text-ink">
              Hapus <strong>{hapus.kode_tempat} · {hapus.nama_perusahaan}</strong> ({hapus.posisi}) beserta kebutuhan kompetensinya? Ini tidak bisa dibatalkan.
            </p>
            {!hapus.bisa_dihapus && (
              <p role="note" className="rounded-ctl bg-mist-200/60 p-3 text-sm text-ink">
                Tempat ini sudah ada di <span className="font-mono">{hapus.terpakai.hasil}</span> hasil perhitungan dan{" "}
                <span className="font-mono">{hapus.terpakai.pilihan}</span> pilihan mahasiswa, jadi tidak bisa dihapus. Ubah statusnya menjadi
                Dikeluarkan supaya tidak ikut dihitung.{" "}
                <Link to={`/admin/tempat/${hapus.kode_tempat}`} className="font-semibold text-navy-800 underline underline-offset-4">
                  Ubah status
                </Link>
              </p>
            )}
            {galatHapus && (
              <p role="alert" className="text-sm font-medium text-coral-700">
                {galatHapus}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setHapus(null)}>
                Batal
              </Button>
              <Button disabled={!hapus.bisa_dihapus} status={deleting ? "loading" : "idle"} loadingLabel="Menghapus…" onClick={konfirmasiHapus}>
                Ya, hapus
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
