import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, CircleAlert, CircleHelp, RefreshCw, Save, SearchX } from "lucide-react";
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
  WaveLine,
} from "../../components/ui";
import KompetensiRow from "../../features/profil/KompetensiRow";
import LevelGuide from "../../features/profil/LevelGuide";
import ProfilSkeleton from "../../features/profil/ProfilSkeleton";
import { useProfil } from "../../features/profil/useProfil";
import { formatTime } from "../../lib/format";

const KATEGORI = {
  Teknis: { title: "Kompetensi Teknis", sub: "Hard skills", order: 0 },
  "Non-Teknis": { title: "Kompetensi Non-Teknis", sub: "Soft skills", order: 1 },
};

const CONFIRMED_MS = 2400;

function groupByKategori(kompetensi) {
  const groups = new Map();
  for (const item of kompetensi) {
    if (!groups.has(item.kategori)) groups.set(item.kategori, []);
    groups.get(item.kategori).push(item);
  }
  return [...groups.entries()]
    .map(([kategori, items]) => ({
      kategori,
      title: KATEGORI[kategori]?.title ?? kategori,
      sub: KATEGORI[kategori]?.sub,
      order: KATEGORI[kategori]?.order ?? 99,
      items,
    }))
    .sort((a, b) => a.order - b.order);
}

function StatusText({ save, dirty }) {
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
      <span className="inline-flex items-center gap-1.5 font-medium text-sea-800">
        <Check aria-hidden="true" size={16} strokeWidth={3} />
        Tersimpan pukul <span className="font-mono">{formatTime(save.savedAt)}</span>
      </span>
    );
  }
  return null;
}

export default function ProfilKompetensi() {
  const profil = useProfil();
  const { load, kompetensi, form, answered, dirty, save } = profil;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const confirmTimer = useRef(null);
  const [params] = useSearchParams();
  const fokusId = Number(params.get("fokus")) || null;
  const [highlightId, setHighlightId] = useState(fokusId);

  useEffect(() => () => clearTimeout(confirmTimer.current), []);

  // Deep link from "Tidak dapat dihitung": scroll to and focus the missing element.
  useEffect(() => {
    if (load.status !== "ready" || !fokusId) return;
    const row = document.getElementById(`kompetensi-${fokusId}`);
    if (!row) return;
    row.scrollIntoView({ block: "center", behavior: "smooth" });
    row.querySelector("input[type=radio]")?.focus({ preventScroll: true });
  }, [load.status, fokusId]);

  const total = kompetensi.length;
  const pct = total ? Math.round((answered / total) * 100) : 0;
  const complete = total > 0 && answered === total;
  const groups = groupByKategori(kompetensi);
  const ready = load.status === "ready" && total > 0;
  const firstName = profil.mahasiswa?.nama?.split(" ")[0];

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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-48 pt-4 md:px-8 lg:pb-10 lg:pt-8">
      <section className="on-dark relative overflow-hidden rounded-card bg-sea-900 px-5 py-6 text-sand-100 md:px-8 md:py-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-sea-200">
          {firstName ? `Halo, ${firstName}` : "Halo"} · langkah 1 dari 3
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] md:text-4xl">
          Profil Kompetensi
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-sea-100">
          Nilai seberapa jauh kemampuanmu di tiap elemen. Jawabanmu dipakai untuk mencocokkanmu dengan tempat magang.
        </p>

        <WaveLine className="mt-5 text-sea-300/60" />

        <div className="mt-4 empty:hidden">
          {load.status === "loading" && <Skeleton className="h-10 w-full bg-sea-800" />}
          {ready && (
            <>
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <p className="text-sm text-sea-200">
                  <span className="font-mono text-2xl font-semibold text-sand-100">{answered}</span> dari{" "}
                  <span className="font-mono">{total}</span> elemen sudah terisi
                </p>
                <span className="font-mono text-sm font-semibold text-sea-100">{pct}%</span>
              </div>
              <SegmentedProgress done={answered} total={total} label="Kelengkapan profil kompetensi" onDark />
              <p className="mt-2.5 text-sm text-sea-200">
                {complete
                  ? "Lengkap. Kamu sudah bisa minta rekomendasi."
                  : "Lengkapi semuanya untuk mulai minta rekomendasi."}
              </p>
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
              {groups.map((group, index) => {
                const done = group.items.filter((item) => form.levels[item.kompetensi_id]).length;
                const groupDone = done === group.items.length;
                return (
                  <Card
                    key={group.kategori}
                    as="section"
                    padded={false}
                    aria-labelledby={`grup-${group.kategori}`}
                    className="motion-rise"
                    style={{ "--i": index + 1 }}
                  >
                    <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 md:px-5">
                      <div className="min-w-0">
                        <h2 id={`grup-${group.kategori}`} className="font-display text-xl font-bold leading-tight">
                          {group.title}
                        </h2>
                        {group.sub && <p className="text-sm text-muted">{group.sub}</p>}
                      </div>
                      <Chip tone={groupDone ? "sea" : "neutral"} icon={groupDone ? Check : undefined}>
                        <span className="font-mono">
                          {done}/{group.items.length}
                        </span>{" "}
                        terisi
                      </Chip>
                    </header>
                    <ul className="divide-y divide-line px-4 md:px-5">
                      {group.items.map((item) => (
                        <KompetensiRow
                          key={item.kompetensi_id}
                          item={item}
                          value={form.levels[item.kompetensi_id]}
                          onChange={handleLevel}
                          highlighted={highlightId === item.kompetensi_id}
                        />
                      ))}
                    </ul>
                  </Card>
                );
              })}

              <Card
                as="section"
                tone="quiet"
                aria-labelledby="grup-data"
                className="motion-rise"
                style={{ "--i": groups.length + 1 }}
              >
                <h2 id="grup-data" className="font-display text-xl font-bold leading-tight">
                  Data pendukung
                </h2>
                <p className="mt-1 max-w-prose text-sm text-muted">
                  Dua hal ini membantu kami mencocokkan minat dan prestasi akademikmu.
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
                    error={profil.ipkError}
                    onChange={(event) => profil.setIpk(event.target.value)}
                    onBlur={profil.touchIpk}
                  />
                  <SelectField
                    id="minat"
                    label="Bidang minat"
                    value={form.minat}
                    error={profil.minatError}
                    onChange={(event) => profil.setMinat(event.target.value)}
                  >
                    <option value="">Pilih bidang</option>
                    {profil.bidangOptions.map((bidang) => (
                      <option key={bidang} value={bidang}>
                        {bidang}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </Card>

              <ActionBar status={<StatusText save={save} dirty={dirty} />}>
                <Button
                  type="submit"
                  size="lg"
                  icon={Save}
                  status={saveStatus}
                  loadingLabel="Menyimpan…"
                  successLabel="Tersimpan"
                  className="whitespace-nowrap"
                >
                  Simpan profil
                </Button>
                {complete && !dirty && (
                  <Button to="/mahasiswa/rekomendasi" variant="outline" size="lg" className="motion-pop whitespace-nowrap">
                    Minta rekomendasi
                  </Button>
                )}
              </ActionBar>
            </>
          )}
        </form>

        <aside aria-label="Panduan level" className="hidden 2xl:sticky 2xl:top-8 2xl:block">
          <Card tone="quiet">
            <h2 className="mb-2 font-display text-xl font-bold">Panduan level</h2>
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
