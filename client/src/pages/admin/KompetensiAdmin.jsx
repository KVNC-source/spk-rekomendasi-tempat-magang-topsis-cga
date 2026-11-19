import { useMemo, useState } from "react";
import { Check, Plus, RefreshCw, TriangleAlert } from "lucide-react";
import { buatKompetensi, getKompetensiAdmin, hapusKompetensi, ubahKompetensi } from "../../api/admin";
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  Skeleton,
  TextAreaField,
  TextField,
  WaveLine,
} from "../../components/ui";
import { useLoad } from "../../features/admin/useLoad";

const KOSONG = { nama_kompetensi: "", kategori: "", deskripsi: "" };

function groupByKategori(daftar) {
  const groups = new Map();
  for (const item of daftar) {
    if (!groups.has(item.kategori)) groups.set(item.kategori, []);
    groups.get(item.kategori).push(item);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "id"))
    .map(([kategori, items]) => ({ kategori, items }));
}

function Pemakaian({ terpakai }) {
  const bagian = [
    terpakai.tempat > 0 && `${terpakai.tempat} kebutuhan tempat`,
    terpakai.mahasiswa > 0 && `${terpakai.mahasiswa} jawaban mahasiswa`,
    terpakai.hasil > 0 && `${terpakai.hasil} hasil perhitungan`,
  ].filter(Boolean);
  return bagian.length > 0 ? `Dipakai di ${bagian.join(", ")}.` : "Belum dipakai.";
}

export default function KompetensiAdmin() {
  const { status, data, error, reload, refresh } = useLoad(getKompetensiAdmin);
  const [sheet, setSheet] = useState(null); // null | { mode: "baru" } | { mode: "ubah", item }
  const [form, setForm] = useState(KOSONG);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [galatUmum, setGalatUmum] = useState(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [pesan, setPesan] = useState(null);

  const groups = useMemo(() => groupByKategori(data ?? []), [data]);
  const kategoriAda = groups.map((g) => g.kategori);

  const buka = (next) => {
    setSheet(next);
    setForm(next.mode === "ubah" ? { nama_kompetensi: next.item.nama_kompetensi, kategori: next.item.kategori, deskripsi: next.item.deskripsi ?? "" } : KOSONG);
    setErrors({});
    setGalatUmum(null);
    setKonfirmasiHapus(false);
  };
  const tutup = () => setSheet(null);
  const isi = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setGalatUmum(null);
    try {
      const body = { nama_kompetensi: form.nama_kompetensi, kategori: form.kategori, deskripsi: form.deskripsi };
      const hasil = sheet.mode === "baru" ? await buatKompetensi(body) : await ubahKompetensi(sheet.item.kode_kompetensi, body);
      setPesan(`${hasil.kode_kompetensi} · ${hasil.nama_kompetensi} ${sheet.mode === "baru" ? "ditambahkan" : "disimpan"}.`);
      tutup();
      refresh();
    } catch (err) {
      setErrors(err.details?.kesalahan ?? {});
      setGalatUmum(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleHapus = async () => {
    setSaving(true);
    setGalatUmum(null);
    try {
      await hapusKompetensi(sheet.item.kode_kompetensi);
      setPesan(`${sheet.item.kode_kompetensi} · ${sheet.item.nama_kompetensi} dihapus.`);
      tutup();
      refresh();
    } catch (err) {
      setGalatUmum(err.message);
      setKonfirmasiHapus(false);
    } finally {
      setSaving(false);
    }
  };

  const item = sheet?.mode === "ubah" ? sheet.item : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 md:px-8 lg:pt-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold leading-[1.05] text-ink md:text-4xl">Kompetensi</h1>
          <p className="mt-2 max-w-prose text-base text-muted">
            Elemen yang dinilai mahasiswa di profilnya. Skala level tetap 0 sampai 4 (Belum punya sampai Ahli) dan tidak
            bisa diubah dari sini.
          </p>
        </div>
        <Button icon={Plus} onClick={() => buka({ mode: "baru" })}>
          Tambah kompetensi
        </Button>
      </header>
      <WaveLine className="mt-4 text-sea-400" />

      {pesan && (
        <p role="status" className="motion-pop mt-4 flex items-center gap-2 rounded-ctl bg-sea-100 px-4 py-3 text-sm font-semibold text-sea-900">
          <Check aria-hidden="true" size={16} strokeWidth={3} />
          {pesan}
        </p>
      )}

      <div className="mt-5 space-y-6">
        {status === "loading" && (
          <Card role="status" aria-label="Sedang memuat kompetensi">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="mb-3 h-12 w-full last:mb-0" />
            ))}
          </Card>
        )}

        {status === "error" && (
          <EmptyState
            variant="error"
            title="Daftar kompetensi belum bisa dimuat"
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
            title="Belum ada kompetensi"
            description="Tambahkan kompetensi pertama. Mahasiswa mengisi levelnya di profil."
            action={<Button onClick={() => buka({ mode: "baru" })}>Tambah kompetensi</Button>}
          />
        )}

        {status === "ready" &&
          groups.map((group) => (
            <section key={group.kategori} aria-label={`Kategori ${group.kategori}`}>
              <h2 className="mb-2 flex items-center gap-2 font-display text-xl font-bold text-ink">
                {group.kategori}
                <Chip>
                  <span className="font-mono">{group.items.length}</span>
                </Chip>
              </h2>
              <Card padded={false}>
                <ul className="divide-y divide-line">
                  {group.items.map((k) => (
                    <li key={k.kode_kompetensi} className="flex items-start justify-between gap-3 p-4 md:px-5">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-sm font-semibold text-sea-800">{k.kode_kompetensi}</span>
                          <span className="font-semibold text-ink">{k.nama_kompetensi}</span>
                        </p>
                        {k.deskripsi && <p className="mt-0.5 max-w-prose text-sm text-muted">{k.deskripsi}</p>}
                        <p className="mt-1 text-xs text-muted">
                          <Pemakaian terpakai={k.terpakai} />
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => buka({ mode: "ubah", item: k })} aria-label={`Ubah ${k.nama_kompetensi}`}>
                        Ubah
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
      </div>

      <BottomSheet open={sheet !== null} onClose={tutup} title={sheet?.mode === "baru" ? "Tambah kompetensi" : `Ubah ${item?.kode_kompetensi ?? ""}`}>
        {sheet && (
          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            {sheet.mode === "baru" ? (
              <div role="note" className="flex gap-3 rounded-ctl border border-coral-300 bg-coral-50 p-3 text-sm leading-relaxed text-ink">
                <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-coral-700" />
                <p>
                  Kompetensi baru langsung muncul di form profil <strong>semua mahasiswa</strong>. Yang belum mengisinya
                  dihitung sebagai “Belum punya” (level 0) sampai mereka mengisi. Kodenya dibuat otomatis dan tidak bisa
                  diubah.
                </p>
              </div>
            ) : (
              <div role="note" className="flex gap-3 rounded-ctl bg-sand-200/60 p-3 text-sm leading-relaxed text-ink">
                <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-sea-700" />
                <p>Nama dan kategori yang kamu ubah tampil di semua halaman, termasuk hasil rekomendasi mahasiswa.</p>
              </div>
            )}

            {galatUmum && Object.keys(errors).length === 0 && (
              <p role="alert" className="text-sm font-medium text-coral-700">
                {galatUmum}
              </p>
            )}

            <TextField id="nama_kompetensi" label="Nama kompetensi" value={form.nama_kompetensi} error={errors.nama_kompetensi} onChange={isi("nama_kompetensi")} autoComplete="off" />
            <div>
              <TextField
                id="kategori"
                label="Kategori"
                hint="Pilih yang sudah ada, atau ketik kategori baru."
                list="daftar-kategori"
                value={form.kategori}
                error={errors.kategori}
                onChange={isi("kategori")}
                autoComplete="off"
              />
              <datalist id="daftar-kategori">
                {kategoriAda.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
            <TextAreaField id="deskripsi" label="Deskripsi (boleh kosong)" value={form.deskripsi} error={errors.deskripsi} onChange={isi("deskripsi")} />

            <Button type="submit" size="lg" className="w-full" status={saving && !konfirmasiHapus ? "loading" : "idle"} loadingLabel="Menyimpan…">
              {sheet.mode === "baru" ? "Tambah kompetensi" : "Simpan perubahan"}
            </Button>

            {item && (
              <div className="border-t border-line pt-4">
                {item.bisa_dihapus ? (
                  konfirmasiHapus ? (
                    <div className="space-y-3" role="alert">
                      <p className="text-sm font-medium text-ink">Hapus {item.kode_kompetensi} · {item.nama_kompetensi}? Ini tidak bisa dibatalkan.</p>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setKonfirmasiHapus(false)}>
                          Batal
                        </Button>
                        <Button status={saving ? "loading" : "idle"} loadingLabel="Menghapus…" onClick={handleHapus}>
                          Ya, hapus
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setKonfirmasiHapus(true)}>
                      Hapus kompetensi
                    </Button>
                  )
                ) : (
                  <p className="text-sm text-muted">
                    Tidak bisa dihapus. <Pemakaian terpakai={item.terpakai} />
                  </p>
                )}
              </div>
            )}
          </form>
        )}
      </BottomSheet>
    </div>
  );
}
