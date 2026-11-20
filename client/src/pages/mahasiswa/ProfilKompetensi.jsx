import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, CircleAlert, CircleHelp, FilePen, Info, RefreshCw, Save, SearchX } from "lucide-react";
import {
  ActionBar,
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  SegmentedProgress,
  SelectField,
  Skeleton,
  TextField,
  Divider,
} from "../../components/ui";
import KompetensiGroup from "../../features/profil/KompetensiGroup";
import LevelGuide from "../../features/profil/LevelGuide";
import ProfilSkeleton from "../../features/profil/ProfilSkeleton";
import { useProfil } from "../../features/profil/useProfil";
import { formatTime } from "../../lib/format";

// Used only while the kompetensi master data carries no kategori.
const TANPA_KATEGORI = "Elemen kompetensi";

const CONFIRMED_MS = 2400;
const kategoriOf = (item) => item.kategori ?? TANPA_KATEGORI;

/** One group per `kategori`, in the order the kategori first appears in the master data. */
function groupByKategori(kompetensi) {
  const groups = new Map();
  for (const item of kompetensi) {
    const key = kategoriOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()].map(([kategori, items]) => ({ kategori, title: kategori, items }));
}

function StatusText({ save, dirty, reason }) {
  if (save.status === "saving") return "Lagi menyimpan…";
  if (save.status === "error") {
    return (
      <span className="inline-flex items-start gap-1.5 font-medium text-coral-700">
        <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
        {save.error}
      </span>
    );
  }
  if (dirty) return "Ada perubahan yang belum disimpan.";
  if (save.savedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-navy-800">
        <Check aria-hidden="true" size={16} strokeWidth={3} />
        Tersimpan pukul <span className="font-mono">{formatTime(save.savedAt)}</span>
      </span>
    );
  }
  return reason ? <span id="alasan-rekomendasi">{reason}</span> : null;
}

export default function ProfilKompetensi() {
  const profil = useProfil();
  const { load, kompetensi, form, answered, missingIds, dataKurang, complete, dirty, errors, save, savedStatus } = profil;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [openOverride, setOpenOverride] = useState({});
  const confirmTimer = useRef(null);
  const [params] = useSearchParams();
  const fokusId = params.get("fokus");
  const [highlightId, setHighlightId] = useState(fokusId);

  useEffect(() => () => clearTimeout(confirmTimer.current), []);

  // Deep link (e.g. from Rekomendasi): scroll to and focus the element to fill in.
  useEffect(() => {
    if (load.status !== "ready" || !fokusId) return;
    const row = document.getElementById(`kompetensi-${fokusId}`);
    if (!row) return;
    row.scrollIntoView({ block: "center", behavior: "smooth" });
    row.querySelector("input[type=radio]")?.focus({ preventScroll: true });
  }, [load.status, fokusId]);

  const total = kompetensi.length;
  const groups = groupByKategori(kompetensi);
  const ready = load.status === "ready" && total > 0;
  const firstName = profil.mahasiswa?.nama?.split(" ")[0];
  const fokusKategori = (() => {
    const target = kompetensi.find((k) => k.kompetensi_id === fokusId);
    return target ? kategoriOf(target) : null;
  })();
  const defaultOpen = profil.initialOpen ?? TANPA_KATEGORI;

  const isOpen = (kategori) => openOverride[kategori] ?? (kategori === defaultOpen || kategori === fokusKategori);
  const toggleGroup = (kategori) => setOpenOverride((o) => ({ ...o, [kategori]: !isOpen(kategori) }));

  const saveStatus = save.status === "saving" ? "loading" : confirmed && !dirty ? "success" : "idle";

  const handleLevel = (id, level) => {
    profil.setLevel(id, level);
    if (id === highlightId) setHighlightId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (save.status === "saving") return;
    const result = await profil.submit();
    if (!result.ok && result.field) document.getElementById(result.field)?.focus();
    if (result.ok) {
      setConfirmed(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmed(false), CONFIRMED_MS);
    }
  };

  // "Lihat rekomendasi" opens only for a saved, complete profile (status Lengkap): every kompetensi
  // answered, "Belum punya" included. The server itself does not reject an unanswered kompetensi (it
  // counts as level 0), but this button still waits for Lengkap.
  const canView = savedStatus === "Lengkap" && !dirty;

  const reasonText = "“Lihat rekomendasi” aktif setelah profilmu Lengkap dan tersimpan.";

  // Names of the kompetensi still unanswered (new ones the Administrator added show up here).
  const namaBelumDiisi = kompetensi.filter((k) => missingIds.includes(k.kompetensi_id)).map((k) => k.nama_kompetensi);
  const MAKS_NAMA = 3;

  const hint = (() => {
    if (complete && dirty) return "Sudah lengkap. Simpan dulu supaya rekomendasi bisa dilihat.";
    if (complete) return "Lengkap. Kamu sudah bisa melihat rekomendasi.";
    const kurang = [];
    if (missingIds.length > 0) kurang.push(`${missingIds.length} kompetensi belum dijawab (pilih satu jawaban tiap elemen, termasuk “Belum punya”)`);
    if (dataKurang.length > 0) kurang.push(`data pendukung: ${dataKurang.join(", ")}`);
    return `Belum lengkap. Masih kurang ${kurang.join("; ")}. Kamu boleh menyimpan sebagai draf dulu.`;
  })();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-48 pt-4 md:px-8 lg:pb-10 lg:pt-8">
      <section className="on-dark relative overflow-hidden rounded-card bg-navy-900 px-5 py-6 text-mist-100 md:px-8 md:py-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-navy-200">
          {firstName ? `Halo, ${firstName}` : "Halo"} · langkah 1 dari 3
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-[1.05] md:text-4xl">
          Profil Kompetensi
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-navy-100">
          Nilai seberapa jauh kemampuanmu di tiap elemen. Jawabanmu dipakai untuk mencocokkanmu dengan tempat magang.
        </p>

        <Divider className="mt-5 text-navy-300/60" />

        <div className="mt-4 empty:hidden">
          {load.status === "loading" && <Skeleton className="h-10 w-full bg-navy-800" />}
          {ready && (
            <>
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <p className="text-sm text-navy-200">
                  <span className="font-mono text-2xl font-semibold text-mist-100">{answered}</span> dari{" "}
                  <span className="font-mono">{total}</span> kompetensi terisi
                </p>
                <Chip tone="ondark" icon={savedStatus === "Lengkap" ? Check : FilePen}>
                  Profil {savedStatus}
                </Chip>
              </div>
              <SegmentedProgress done={answered} total={total} label="Kelengkapan profil kompetensi" onDark />
              <p className="mt-2.5 max-w-xl text-sm text-navy-200">{hint}</p>
            </>
          )}
        </div>

        <Button
          variant="light"
          icon={CircleHelp}
          className="mt-5 2xl:hidden"
          onClick={() => setSheetOpen(true)}
        >
          Panduan level
        </Button>
      </section>

      <div className="mt-6 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:items-start 2xl:gap-8">
        <form noValidate onSubmit={handleSubmit} className="min-w-0 space-y-5">
          {load.status === "loading" && <ProfilSkeleton />}

          {load.status === "error" && (
            <EmptyState
              variant="error"
              title="Profilmu belum bisa dimuat"
              description={`${load.error} Coba muat ulang. Kalau masih gagal, tunggu sebentar lalu coba lagi.`}
              action={
                <Button variant="secondary" icon={RefreshCw} onClick={profil.reload}>
                  Muat ulang
                </Button>
              }
            />
          )}

          {load.status === "ready" && total === 0 && (
            <EmptyState
              icon={SearchX}
              title="Daftar kompetensi belum tersedia"
              description="Administrator belum menambahkan elemen kompetensi, jadi belum ada yang bisa kamu isi. Coba cek lagi nanti."
              action={
                <Button variant="secondary" icon={RefreshCw} onClick={profil.reload}>
                  Cek lagi
                </Button>
              }
            />
          )}

          {ready && (
            <>
              {missingIds.length > 0 && (
                <Card tone="quiet" role="note" className="motion-pop flex gap-3">
                  <Info aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-navy-700" />
                  <div className="max-w-prose text-sm leading-relaxed text-ink">
                    <p className="font-semibold">
                      <span className="font-mono">{missingIds.length}</span> kompetensi belum kamu isi
                    </p>
                    <p className="mt-1">
                      {namaBelumDiisi.slice(0, MAKS_NAMA).join(", ")}
                      {namaBelumDiisi.length > MAKS_NAMA && ` dan ${namaBelumDiisi.length - MAKS_NAMA} lainnya`}.
                      Isi semuanya (boleh “Belum punya”) supaya profilmu Lengkap dan rekomendasi bisa dilihat. Yang masih
                      kosong dihitung sebagai “Belum punya” (level 0).
                    </p>
                  </div>
                </Card>
              )}

              {groups.map((group, index) => (
                <KompetensiGroup
                  key={group.kategori}
                  group={group}
                  index={index}
                  levels={form.levels}
                  open={isOpen(group.kategori)}
                  onToggle={() => toggleGroup(group.kategori)}
                  onChange={handleLevel}
                  highlightId={highlightId}
                />
              ))}

              <Card
                as="section"
                tone="quiet"
                aria-labelledby="grup-data"
                className="motion-rise"
                style={{ "--i": groups.length + 1 }}
              >
                <h2 id="grup-data" className="font-display text-xl font-semibold leading-tight">
                  Data pendukung
                </h2>
                <p className="mt-1 max-w-prose text-sm text-muted">
                  Dipakai untuk mencocokkan minat, prestasi akademik, jarak, dan pengalamanmu.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="ipk"
                    label="IPK"
                    mono
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="3,62"
                    hint="Skala 0–4. Boleh pakai koma."
                    value={form.ipk}
                    error={errors.ipk}
                    onChange={(event) => profil.setField("ipk")(event.target.value)}
                    onBlur={profil.touch("ipk")}
                  />
                  <SelectField
                    id="minat"
                    label="Bidang minat"
                    value={form.minat}
                    error={errors.minat}
                    onChange={(event) => profil.setField("minat")(event.target.value)}
                  >
                    <option value="">Pilih bidang</option>
                    {profil.bidangOptions.map((bidang) => (
                      <option key={bidang} value={bidang}>
                        {bidang}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    id="kota"
                    label="Kota domisili"
                    hint="Dipakai untuk menghitung jarak ke tempat magang."
                    value={form.kota}
                    error={errors.kota}
                    className="sm:col-span-2"
                    onChange={(event) => profil.setField("kota")(event.target.value)}
                  >
                    <option value="">Pilih kota</option>
                    {profil.kotaOptions.map((kota) => (
                      <option key={kota.kota} value={kota.kota}>
                        {kota.kota}
                      </option>
                    ))}
                  </SelectField>
                  <TextField
                    id="proyek"
                    label="Jumlah proyek"
                    mono
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    hint="Hanya proyek yang relevan dengan bidang TI."
                    value={form.proyek}
                    error={errors.proyek}
                    onChange={(event) => profil.setField("proyek")(event.target.value)}
                    onBlur={profil.touch("proyek")}
                  />
                  <TextField
                    id="sertifikasi"
                    label="Jumlah sertifikasi"
                    mono
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    hint="Hanya sertifikasi profesional yang relevan dengan bidang TI."
                    value={form.sertifikasi}
                    error={errors.sertifikasi}
                    onChange={(event) => profil.setField("sertifikasi")(event.target.value)}
                    onBlur={profil.touch("sertifikasi")}
                  />
                </div>
              </Card>

              <ActionBar status={<StatusText save={save} dirty={dirty} reason={canView ? null : reasonText} />}>
                <Button
                  type="submit"
                  size="lg"
                  icon={Save}
                  status={saveStatus}
                  loadingLabel="Menyimpan…"
                  successLabel="Tersimpan"
                  className="whitespace-nowrap"
                >
                  {complete || savedStatus === "Lengkap" ? "Simpan profil" : "Simpan draf"}
                </Button>
                {canView ? (
                  <Button to="/mahasiswa/rekomendasi" variant="outline" size="lg" className="motion-pop whitespace-nowrap">
                    Lihat rekomendasi
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="lg"
                    disabled
                    aria-describedby="alasan-rekomendasi"
                    className="whitespace-nowrap"
                  >
                    Lihat rekomendasi
                  </Button>
                )}
              </ActionBar>
            </>
          )}
        </form>

        <aside aria-label="Panduan level" className="hidden 2xl:sticky 2xl:top-8 2xl:block">
          <Card tone="quiet">
            <h2 className="mb-2 font-display text-xl font-semibold">Panduan level</h2>
            <LevelGuide />
          </Card>
        </aside>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Panduan level">
        <LevelGuide />
      </BottomSheet>
    </div>
  );
}
