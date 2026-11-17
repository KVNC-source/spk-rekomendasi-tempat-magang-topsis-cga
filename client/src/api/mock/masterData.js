/**
 * Master data for the mock API.
 *
 * - Kompetensi: ids and names come from the dataset. If `data/kompetensi.json`
 *   exists (kategori + deskripsi per K01–K21, from the workbook's `kompetensi`
 *   sheet) it is merged in automatically.
 * - Kota domisili: `data/kota_domisili.json` (27 kota) is used when present.
 *   Until then a TEMPORARY list is derived from the coordinates already in the
 *   dataset (plus Manado from profil_contoh.json), so the picker works.
 *
 * Drop the two JSON files into `./data/` and reload; no code change needed.
 * Accepted shapes: an array, or an object wrapping the array under
 * `kompetensi` / `kota`; field names `id|kompetensi_id|kompetensiId`,
 * `nama|nama_kompetensi`, `kota|nama`, `lat|latitude`, `lon|lng|longitude`.
 */
import dataset from "./data/dataset.json";
import { BIDANG } from "./engine/config.js";

export { BIDANG };

const optional = import.meta.glob("./data/{kompetensi,kota_domisili}.json", {
  eager: true,
  import: "default",
});

const first = (obj, ...keys) => keys.map((key) => obj[key]).find((value) => value !== undefined);
const asList = (raw, wrapperKey) => (Array.isArray(raw) ? raw : (raw?.[wrapperKey] ?? raw?.data ?? []));

const kompetensiFile = optional["./data/kompetensi.json"];
const kotaFile = optional["./data/kota_domisili.json"];

export const MASTER_SOURCE = { kompetensi: Boolean(kompetensiFile), kota: Boolean(kotaFile) };

const extra = new Map(
  asList(kompetensiFile, "kompetensi").map((k) => [first(k, "id", "kompetensi_id", "kompetensiId"), k]),
);

export const KOMPETENSI = dataset.kompetensi.map((k) => {
  const e = extra.get(k.id) ?? {};
  return {
    kompetensi_id: k.id,
    nama_kompetensi: first(e, "nama", "nama_kompetensi") ?? k.nama,
    kategori: e.kategori ?? null,
    deskripsi: e.deskripsi ?? null,
    skala_maksimum: e.skala_maksimum ?? 4,
  };
});

function temporaryKota() {
  const seen = new Map();
  seen.set("Manado", { kota: "Manado", lat: 1.4748, lon: 124.8421 });
  for (const t of dataset.tempat) {
    if (typeof t.lat !== "number" || typeof t.lon !== "number") continue;
    const kota = t.lokasi.split("(")[0].replace(/^Kota\s+/i, "").trim();
    if (!seen.has(kota)) seen.set(kota, { kota, lat: t.lat, lon: t.lon });
  }
  return [...seen.values()].sort((a, b) => a.kota.localeCompare(b.kota, "id"));
}

export const KOTA = kotaFile
  ? asList(kotaFile, "kota")
      .map((k) => ({
        kota: first(k, "kota", "nama"),
        lat: first(k, "lat", "latitude"),
        lon: first(k, "lon", "lng", "longitude"),
      }))
      .sort((a, b) => a.kota.localeCompare(b.kota, "id"))
  : temporaryKota();

if (import.meta.env.DEV && (!MASTER_SOURCE.kompetensi || !MASTER_SOURCE.kota)) {
  console.info(
    "[mock] Missing in src/api/mock/data/:",
    [!MASTER_SOURCE.kompetensi && "kompetensi.json", !MASTER_SOURCE.kota && "kota_domisili.json"]
      .filter(Boolean)
      .join(", "),
    "— using temporary stand-ins.",
  );
}
