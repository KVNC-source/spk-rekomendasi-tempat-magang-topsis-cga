import { useState } from "react";
import { Check, CircleAlert, Info, RefreshCw, Save } from "lucide-react";
import { getKriteria, simpanBobot } from "../../api/admin";
import { ActionBar, Button, Card, Chip, EmptyState, Skeleton, TextField, Divider } from "../../components/ui";
import { useLoad } from "../../features/admin/useLoad";
import { formatNumber, formatTrim } from "../../lib/format";

const UNIT = 10000; // weights have 4 decimals; compared as whole units, never as floating point
const SAMA_UNTUK_SEMUA = new Set(["C3", "C7"]);
const CONFIRMED_MS = 2400;

/** "0,25" or "0.25" -> whole units of 1/10000, or null when it is not a valid weight. */
function keUnit(text) {
  const clean = String(text ?? "").trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const n = Number(clean);
  const unit = Math.round(n * UNIT);
  if (n > 1 || Math.abs(n * UNIT - unit) > 1e-7) return null;
  return unit;
}

export default function KriteriaAdmin() {
  const { status, data, error, reload } = useLoad(getKriteria);
  const [tersimpan, setTersimpan] = useState(null); // the answer of the last save, newer than `data`
  const [edits, setEdits] = useState({}); // code -> text, only what the Administrator typed
  const [save, setSave] = useState({ status: "idle", error: null, kesalahan: {}, peringatan: [] });
  const [berhasil, setBerhasil] = useState(false);

  const sumber = tersimpan ?? data;
  const kriteria = sumber?.kriteria ?? [];
  const teks = (k) => edits[k.kode_kriteria] ?? formatTrim(k.bobot, 4);
  const unit = (k) => keUnit(teks(k));
  const semuaValid = kriteria.length > 0 && kriteria.every((k) => unit(k) !== null);
  const totalUnit = semuaValid ? kriteria.reduce((sum, k) => sum + unit(k), 0) : null;
  const totalTepat = totalUnit === UNIT;
  const berubah = kriteria.some((k) => unit(k) !== Math.round(k.bobot * UNIT));
  const bisaSimpan = semuaValid && totalTepat && berubah && save.status !== "saving";

  const handleSave = async () => {
    if (!bisaSimpan) return;
    setSave({ status: "saving", error: null, kesalahan: {}, peringatan: [] });
    try {
      const hasil = await simpanBobot(Object.fromEntries(kriteria.map((k) => [k.kode_kriteria, unit(k) / UNIT])));
      setTersimpan(hasil);
      setEdits({});
      setSave({ status: "idle", error: null, kesalahan: {}, peringatan: hasil.peringatan ?? [] });
      setBerhasil(true);
      setTimeout(() => setBerhasil(false), CONFIRMED_MS);
    } catch (err) {
      setSave({ status: "error", error: err.message, kesalahan: err.details?.kesalahan ?? {}, peringatan: [] });
    }
  };

  const totalTeks = totalUnit === null ? "–" : formatNumber(totalUnit / UNIT, totalUnit % 100 === 0 ? 2 : 4);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-48 pt-6 md:px-8 lg:max-w-4xl lg:pb-10 lg:pt-8">
      <header>
        <h1 className="font-display text-3xl font-semibold leading-[1.05] text-ink md:text-4xl">Kriteria TOPSIS</h1>
        <p className="mt-2 max-w-prose text-base text-muted">
          Bobot C1 sampai C7 untuk membandingkan tempat magang. Totalnya harus tepat 1,00.
        </p>
        <Divider className="mt-4 text-navy-400" />
      </header>

      <Card tone="quiet" className="mt-5 flex gap-3" role="note">
        <Info aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-navy-700" />
        <div className="max-w-prose text-sm leading-relaxed text-ink">
          <p>
            <Chip tone="coral">Sementara, menunggu validasi pakar</Chip>
          </p>
          <p className="mt-2">
            Perubahan yang kamu simpan dipakai pada perhitungan rekomendasi berikutnya. Hasil yang sudah dilihat
            mahasiswa tidak ikut berubah sampai mereka menghitung ulang.
          </p>
        </div>
      </Card>

      <div className="mt-5 space-y-4">
        {status === "loading" && (
          <Card role="status" aria-label="Sedang memuat bobot kriteria">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="mb-3 h-12 w-full last:mb-0" />
            ))}
          </Card>
        )}

        {status === "error" && (
          <EmptyState
            variant="error"
            title="Bobot kriteria belum bisa dimuat"
            description={`${error} Coba muat ulang. Kalau masih gagal, tunggu sebentar lalu coba lagi.`}
            action={
              <Button variant="secondary" icon={RefreshCw} onClick={reload}>
                Muat ulang
              </Button>
            }
          />
        )}

        {status === "ready" && (
          <>
            <Card as="section" aria-label="Bobot per kriteria" padded={false}>
              <ul className="divide-y divide-line">
                {kriteria.map((k) => {
                  const u = unit(k);
                  const salah = save.kesalahan[k.kode_kriteria] ?? (u === null ? "Tulis angka 0 sampai 1, maksimal 4 angka di belakang koma." : null);
                  return (
                    <li key={k.kode_kriteria} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-start md:p-5">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-navy-800">{k.kode_kriteria}</span>
                          <Chip tone={k.tipe === "cost" ? "coral" : "navy"}>{k.tipe === "cost" ? "Cost (makin kecil makin baik)" : "Benefit"}</Chip>
                        </p>
                        <p className="mt-1 font-semibold text-ink">{k.nama_kriteria}</p>
                        {SAMA_UNTUK_SEMUA.has(k.kode_kriteria) && (
                          <p className="mt-1 text-sm text-muted">
                            Bernilai sama untuk semua tempat magang, jadi bobot ini tidak mengubah urutan.
                          </p>
                        )}
                        {u === 0 && <p className="mt-1 text-sm font-medium text-coral-700">Kriteria ini tidak berpengaruh pada hasil.</p>}
                      </div>
                      <TextField
                        id={`bobot-${k.kode_kriteria}`}
                        label={`Bobot ${k.kode_kriteria}`}
                        mono
                        inputMode="decimal"
                        autoComplete="off"
                        value={teks(k)}
                        error={salah}
                        onChange={(event) => setEdits((e) => ({ ...e, [k.kode_kriteria]: event.target.value }))}
                      />
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card
              as="section"
              aria-label="Total bobot"
              className={`flex flex-wrap items-center justify-between gap-3 ${totalUnit !== null && !totalTepat ? "border-coral-300 bg-coral-50" : ""}`}
            >
              <p className="text-base font-semibold text-ink">Total bobot</p>
              <p aria-live="polite" className="flex items-center gap-2 font-mono text-2xl font-semibold text-ink">
                {totalTeks}
                {totalTepat ? (
                  <Chip tone="navy" icon={Check}>
                    Tepat 1,00
                  </Chip>
                ) : (
                  <Chip tone="coral" icon={CircleAlert}>
                    Harus 1,00
                  </Chip>
                )}
              </p>
              {save.kesalahan.total && <p className="w-full text-sm font-medium text-coral-700">{save.kesalahan.total}</p>}
            </Card>

            {save.peringatan.length > 0 && (
              <Card tone="quiet" role="status" className="text-sm text-ink">
                <ul className="list-disc space-y-1 pl-5">
                  {save.peringatan.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>

      {status === "ready" && (
        <ActionBar
          status={
            save.status === "error" ? (
              <span className="font-medium text-coral-700">{save.error}</span>
            ) : !totalTepat && semuaValid ? (
              "Simpan aktif setelah total bobot tepat 1,00."
            ) : !semuaValid ? (
              "Periksa bobot yang ditandai."
            ) : null
          }
        >
          <Button
            size="lg"
            icon={Save}
            disabled={!bisaSimpan && !berhasil}
            status={save.status === "saving" ? "loading" : berhasil ? "success" : "idle"}
            loadingLabel="Menyimpan…"
            successLabel="Tersimpan"
            onClick={handleSave}
            className="whitespace-nowrap"
          >
            Simpan bobot
          </Button>
        </ActionBar>
      )}
    </div>
  );
}
