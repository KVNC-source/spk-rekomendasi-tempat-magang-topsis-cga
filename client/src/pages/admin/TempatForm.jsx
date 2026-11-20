import { useCallback, useState } from "react";
import { ArrowLeft, CircleAlert, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { buatTempat, getReferensi, getTempat, ubahTempat } from "../../api/admin";
import {
  ActionBar,
  Button,
  Card,
  Chip,
  EmptyState,
  SelectField,
  Skeleton,
  TextAreaField,
  TextField,
  Divider,
} from "../../components/ui";
import { useLoad } from "../../features/admin/useLoad";
import { LEVELS } from "../../lib/levels";

// Keys for the kebutuhan rows (a row has no id of its own until it is saved).
let barisBerikutnya = 0;
const baris = (k) => ({
  uid: barisBerikutnya++,
  kompetensi: k?.kompetensi ?? "",
  level_minimum: k ? String(k.level_minimum) : "",
  wajib: k ? (k.wajib ? "wajib" : "opsional") : "",
});

const teks = (value) => (value === null || value === undefined ? "" : String(value).replace(".", ","));
const atauNull = (value) => (value.trim() === "" ? null : value.trim());

/** Server error key -> DOM id, so the first wrong field can take focus. */
const idDariKunci = (kunci) => kunci.replace(/^kebutuhan\[(\d+)\]\.(\w+)$/, "kebutuhan-$1-$2");

function formAwal(tempat) {
  return {
    kode_tempat: "",
    nama_perusahaan: tempat?.nama_perusahaan ?? "",
    posisi: tempat?.posisi ?? "",
    bidang_industri: tempat?.bidang_industri ?? "",
    lokasi: tempat?.lokasi ?? "",
    latitude: teks(tempat?.latitude),
    longitude: teks(tempat?.longitude),
    mode_kerja: tempat?.mode_kerja ?? "",
    benefit_finansial: teks(tempat?.benefit_finansial),
    reputasi: teks(tempat?.reputasi),
    status_alternatif: tempat?.status_alternatif ?? "Dipakai",
    alasan_dikeluarkan: tempat?.alasan_dikeluarkan ?? "",
    sumber_url: tempat?.sumber_url ?? "",
    tanggal_akses: tempat?.tanggal_akses ?? "",
  };
}

function Isi({ referensi, tempat }) {
  const navigate = useNavigate();
  const baru = !tempat;

  const [form, setForm] = useState(() => ({ ...formAwal(tempat), kode_tempat: baru ? referensi.saran_kode_tempat : "" }));
  const [kebutuhan, setKebutuhan] = useState(() => (tempat ? tempat.kebutuhan.map(baris) : [baris()]));
  const [errors, setErrors] = useState({});
  const [galatUmum, setGalatUmum] = useState(null);
  const [saving, setSaving] = useState(false);

  const isi = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));
  const ubahBaris = (uidBaris, field) => (event) =>
    setKebutuhan((rows) => rows.map((r) => (r.uid === uidBaris ? { ...r, [field]: event.target.value } : r)));

  const jumlahWajib = kebutuhan.filter((r) => r.wajib === "wajib").length;
  const jumlahOpsional = kebutuhan.filter((r) => r.wajib === "opsional").length;
  const dikeluarkan = form.status_alternatif === "Dikeluarkan";
  const { latMin, latMax, lonMin, lonMax } = referensi.batas_koordinat;
  const koma = (n) => String(n).replace(".", ",");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setGalatUmum(null);
    const payload = {
      ...(baru ? { kode_tempat: atauNull(form.kode_tempat) } : {}),
      nama_perusahaan: form.nama_perusahaan,
      posisi: form.posisi,
      bidang_industri: form.bidang_industri,
      lokasi: form.lokasi,
      latitude: atauNull(form.latitude),
      longitude: atauNull(form.longitude),
      mode_kerja: atauNull(form.mode_kerja),
      benefit_finansial: atauNull(form.benefit_finansial),
      reputasi: atauNull(form.reputasi),
      status_alternatif: form.status_alternatif,
      alasan_dikeluarkan: atauNull(form.alasan_dikeluarkan),
      sumber_url: atauNull(form.sumber_url),
      tanggal_akses: atauNull(form.tanggal_akses),
      kebutuhan: kebutuhan.map((r) => ({
        kompetensi: r.kompetensi,
        level_minimum: r.level_minimum === "" ? null : Number(r.level_minimum),
        wajib: r.wajib === "" ? null : r.wajib === "wajib",
      })),
    };
    try {
      const hasil = baru ? await buatTempat(payload) : await ubahTempat(tempat.kode_tempat, payload);
      navigate("/admin/tempat", { state: { pesan: `${hasil.kode_tempat} · ${hasil.nama_perusahaan} ${baru ? "ditambahkan" : "disimpan"}.` } });
    } catch (err) {
      const kesalahan = err.details?.kesalahan ?? {};
      setErrors(kesalahan);
      setGalatUmum(Object.keys(kesalahan).length > 0 ? `Ada ${Object.keys(kesalahan).length} isian yang perlu diperbaiki.` : err.message);
      const pertama = Object.keys(kesalahan)[0];
      if (pertama) setTimeout(() => document.getElementById(idDariKunci(pertama))?.focus(), 0);
      setSaving(false);
    }
  };

  const sudahDipilih = (uidBaris) => new Set(kebutuhan.filter((r) => r.uid !== uidBaris).map((r) => r.kompetensi));

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-4">
      {galatUmum && (
        <div role="alert" className="motion-pop flex items-start gap-2 rounded-ctl border border-coral-300 bg-coral-50 p-3 text-sm font-medium text-coral-700">
          <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
          {galatUmum}
        </div>
      )}

      <Card as="section" aria-labelledby="sec-data" className="space-y-4">
        <h2 id="sec-data" className="font-display text-xl font-semibold leading-tight">Data lowongan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {baru ? (
            <TextField id="kode_tempat" label="Kode tempat" mono hint="Dibuat otomatis. Tidak bisa diubah setelah disimpan." value={form.kode_tempat} error={errors.kode_tempat} onChange={isi("kode_tempat")} autoComplete="off" />
          ) : (
            <TextField id="kode_tempat" label="Kode tempat" mono value={tempat.kode_tempat} readOnly hint="Tidak bisa diubah." />
          )}
          <SelectField id="bidang_industri" label="Bidang industri" value={form.bidang_industri} error={errors.bidang_industri} onChange={isi("bidang_industri")}>
            <option value="">Pilih bidang</option>
            {referensi.bidang.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </SelectField>
          <TextField id="nama_perusahaan" label="Nama perusahaan" value={form.nama_perusahaan} error={errors.nama_perusahaan} onChange={isi("nama_perusahaan")} autoComplete="off" />
          <TextField id="posisi" label="Posisi magang" value={form.posisi} error={errors.posisi} onChange={isi("posisi")} autoComplete="off" />
          <TextField id="sumber_url" label="Tautan lowongan asli (boleh kosong)" type="url" inputMode="url" placeholder="https://" value={form.sumber_url} error={errors.sumber_url} onChange={isi("sumber_url")} autoComplete="off" className="sm:col-span-2" />
          <TextField id="tanggal_akses" label="Tanggal diakses (boleh kosong)" type="date" value={form.tanggal_akses} error={errors.tanggal_akses} onChange={isi("tanggal_akses")} />
        </div>
      </Card>

      <Card as="section" aria-labelledby="sec-lokasi" className="space-y-4">
        <div>
          <h2 id="sec-lokasi" className="font-display text-xl font-semibold leading-tight">Lokasi dan cara kerja</h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Koordinat dipakai untuk menghitung jarak dan harus berada di wilayah Indonesia (lintang {koma(latMin)} sampai {koma(latMax)}, bujur {koma(lonMin)} sampai {koma(lonMax)}).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="lokasi" label="Lokasi" hint="Contoh: Kota Manado (Wenang)" value={form.lokasi} error={errors.lokasi} onChange={isi("lokasi")} autoComplete="off" className="sm:col-span-2" />
          <TextField id="latitude" label="Garis lintang (latitude)" mono inputMode="decimal" placeholder="1,4748" value={form.latitude} error={errors.latitude} onChange={isi("latitude")} autoComplete="off" />
          <TextField id="longitude" label="Garis bujur (longitude)" mono inputMode="decimal" placeholder="124,8421" value={form.longitude} error={errors.longitude} onChange={isi("longitude")} autoComplete="off" />
          <div>
            <TextField id="mode_kerja" label="Mode kerja (boleh kosong)" list="saran-mode-kerja" hint="Remote/WFH tidak ikut dihitung (Batasan 3)." value={form.mode_kerja} error={errors.mode_kerja} onChange={isi("mode_kerja")} autoComplete="off" />
            <datalist id="saran-mode-kerja">
              {referensi.mode_kerja_saran.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
        </div>
      </Card>

      <Card as="section" aria-labelledby="sec-benefit" className="space-y-4">
        <h2 id="sec-benefit" className="font-display text-xl font-semibold leading-tight">Benefit dan reputasi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="benefit_finansial" label="Benefit finansial (boleh kosong)" mono inputMode="decimal" hint="Juta rupiah per bulan. Kosong dihitung dengan nilai tengah dan ditandai “perkiraan”." value={form.benefit_finansial} error={errors.benefit_finansial} onChange={isi("benefit_finansial")} autoComplete="off" />
          <TextField id="reputasi" label="Reputasi 1 sampai 5 (boleh kosong)" mono inputMode="numeric" hint="Kosong dianggap perkiraan." value={form.reputasi} error={errors.reputasi} onChange={isi("reputasi")} autoComplete="off" />
        </div>
      </Card>

      <Card as="section" aria-labelledby="sec-status" className="space-y-4">
        <h2 id="sec-status" className="font-display text-xl font-semibold leading-tight">Status</h2>
        <SelectField id="status_alternatif" label="Status di perhitungan" value={form.status_alternatif} error={errors.status_alternatif} onChange={isi("status_alternatif")}>
          <option value="Dipakai">Dipakai (ikut dihitung)</option>
          <option value="Dikeluarkan">Dikeluarkan (tidak ikut dihitung)</option>
        </SelectField>
        {dikeluarkan ? (
          <TextAreaField id="alasan_dikeluarkan" label="Alasan dikeluarkan" value={form.alasan_dikeluarkan} error={errors.alasan_dikeluarkan} onChange={isi("alasan_dikeluarkan")} />
        ) : (
          <p className="max-w-prose text-sm text-muted">
            Tempat yang Dipakai butuh koordinat, bukan remote/WFH, dan minimal satu kompetensi wajib.
          </p>
        )}
      </Card>

      <Card as="section" aria-labelledby="sec-kebutuhan" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="sec-kebutuhan" className="font-display text-xl font-semibold leading-tight">Kebutuhan kompetensi</h2>
            <p className="mt-1 max-w-prose text-sm text-muted">Level minimum 1 sampai 4. Wajib dihitung 60%, opsional 40% (kalau ada).</p>
          </div>
          <Chip tone={dikeluarkan || jumlahWajib > 0 ? "navy" : "coral"}>
            <span className="font-mono">{jumlahWajib}</span> wajib · <span className="font-mono">{jumlahOpsional}</span> opsional
          </Chip>
        </div>

        {errors.kebutuhan && (
          <p id="kebutuhan" tabIndex={-1} role="alert" className="flex items-start gap-1.5 text-sm font-medium text-coral-700">
            <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {errors.kebutuhan}
          </p>
        )}

        <ul className="space-y-3">
          {kebutuhan.map((r, i) => {
            const dipakai = sudahDipilih(r.uid);
            return (
              <li key={r.uid} className="grid gap-3 rounded-tile border border-line bg-mist-50 p-3 sm:grid-cols-[minmax(0,1fr)_11.5rem_9rem_auto] sm:items-start">
                <SelectField id={`kebutuhan-${i}-kompetensi`} label="Kompetensi" value={r.kompetensi} error={errors[`kebutuhan[${i}].kompetensi`]} onChange={ubahBaris(r.uid, "kompetensi")}>
                  <option value="">Pilih kompetensi</option>
                  {referensi.kompetensi.map((k) => (
                    <option key={k.kode_kompetensi} value={k.kode_kompetensi} disabled={dipakai.has(k.kode_kompetensi)}>
                      {k.kode_kompetensi} · {k.nama_kompetensi}
                    </option>
                  ))}
                </SelectField>
                <SelectField id={`kebutuhan-${i}-level_minimum`} label="Level minimum" value={r.level_minimum} error={errors[`kebutuhan[${i}].level_minimum`]} onChange={ubahBaris(r.uid, "level_minimum")}>
                  <option value="">Pilih</option>
                  {LEVELS.map((l) => (
                    <option key={l.level} value={l.level}>{l.level} · {l.label}</option>
                  ))}
                </SelectField>
                <SelectField id={`kebutuhan-${i}-wajib`} label="Jenis" value={r.wajib} error={errors[`kebutuhan[${i}].wajib`]} onChange={ubahBaris(r.uid, "wajib")}>
                  <option value="">Pilih</option>
                  <option value="wajib">Wajib</option>
                  <option value="opsional">Opsional</option>
                </SelectField>
                <Button variant="ghost" icon={Trash2} aria-label={`Hapus kompetensi baris ${i + 1}`} onClick={() => setKebutuhan((rows) => rows.filter((x) => x.uid !== r.uid))} className="sm:mt-7" />
              </li>
            );
          })}
        </ul>

        <Button variant="outline" icon={Plus} onClick={() => setKebutuhan((rows) => [...rows, baris()])}>
          Tambah kompetensi
        </Button>
      </Card>

      <ActionBar status={galatUmum ? <span className="font-medium text-coral-700">{galatUmum}</span> : null}>
        <Button to="/admin/tempat" variant="outline" size="lg" className="whitespace-nowrap">
          Batal
        </Button>
        <Button type="submit" size="lg" icon={Save} status={saving ? "loading" : "idle"} loadingLabel="Menyimpan…" className="whitespace-nowrap">
          {baru ? "Tambah tempat" : "Simpan perubahan"}
        </Button>
      </ActionBar>
    </form>
  );
}

export default function TempatForm() {
  const { kode } = useParams();
  const load = useCallback(
    () => Promise.all([getReferensi(), kode ? getTempat(kode) : Promise.resolve(null)]).then(([referensi, tempat]) => ({ referensi, tempat })),
    [kode],
  );
  const { status, data, error, reload } = useLoad(load);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-48 pt-4 md:px-8 lg:max-w-4xl lg:pb-10 lg:pt-6">
      <Button to="/admin/tempat" variant="ghost" icon={ArrowLeft} className="-ml-3">
        Kembali ke daftar
      </Button>
      <header className="mt-2">
        <h1 className="font-display text-3xl font-semibold leading-[1.05] text-ink md:text-4xl">
          {kode ? "Ubah tempat magang" : "Tambah tempat magang"}
        </h1>
        <Divider className="mt-4 text-navy-400" />
      </header>

      {status === "loading" && (
        <div role="status" aria-label="Sedang memuat form" className="mt-5 space-y-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="mt-4 h-12 w-full" />
            </Card>
          ))}
        </div>
      )}

      {status === "error" && (
        <EmptyState
          className="mt-5"
          variant="error"
          title={kode ? "Tempat magang ini belum bisa dimuat" : "Form belum bisa dimuat"}
          description={`${error} Coba muat ulang. Kalau masih gagal, tunggu sebentar lalu coba lagi.`}
          action={
            <Button variant="secondary" icon={RefreshCw} onClick={reload}>
              Muat ulang
            </Button>
          }
        />
      )}

      {status === "ready" && <Isi key={kode ?? "baru"} referensi={data.referensi} tempat={data.tempat} />}
    </div>
  );
}
