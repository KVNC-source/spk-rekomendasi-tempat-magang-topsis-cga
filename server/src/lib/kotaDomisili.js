/**
 * The master list of domicile cities (data/kota_domisili.json, 27 kota with their
 * centre coordinates). A mahasiswa's kota is stored as a name from this list and
 * validated against it; the coordinates used for C4 come from it too, never from
 * the request. The coordinates are approximate city centres (see the file's note).
 */
import { readFileSync } from 'node:fs';

const berkas = JSON.parse(readFileSync(new URL('../data/kota_domisili.json', import.meta.url), 'utf8'));

export const DAFTAR_KOTA = Object.freeze(
  berkas.kota.map(({ kota, provinsi, lat, lon }) => Object.freeze({ kota, provinsi, lat, lon }))
);

const normal = (nama) => String(nama ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const indeks = new Map(DAFTAR_KOTA.map((k) => [normal(k.kota), k]));

/** The list entry for a city name (case and spacing do not matter), or undefined. */
export const cariKota = (nama) => indeks.get(normal(nama));
