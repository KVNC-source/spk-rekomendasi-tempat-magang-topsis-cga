import { test } from "node:test";
import assert from "node:assert/strict";
import { ALASAN_CETAK, alasanCetakNonaktif } from "../src/features/rekomendasi/alasanCetak.js";

const pilihan = { tempat_id: "T05", namaPerusahaan: "PT Contoh" };
const item = { id: "T05", rank: 1 };
const profil = { mahasiswa: { nama: "Contoh", nim: "1", angkatan: 2023 } };
const hasilSegar = { basi: false, penyebabBasi: [], ranking: [item] };
const siap = () => ({ pilihan, hasil: hasilSegar, item, profil });

test("printing is allowed when the result is fresh, the pilihan is in it and the profile is read", () => {
  assert.equal(alasanCetakNonaktif(siap()), null);
});

test("a stale result switches the button off with the exact wording, whatever the cause", () => {
  const alasan = "Hitung ulang dulu supaya ringkasan sesuai data terbaru";
  assert.equal(ALASAN_CETAK.basi, alasan);
  assert.equal(alasanCetakNonaktif({ ...siap(), hasil: { ...hasilSegar, basi: true, penyebabBasi: ["profil"] } }), alasan);
  assert.equal(alasanCetakNonaktif({ ...siap(), hasil: { ...hasilSegar, basi: true, penyebabBasi: ["data"] } }), alasan);
  assert.equal(alasanCetakNonaktif({ ...siap(), hasil: { ...hasilSegar, basi: true, penyebabBasi: ["profil", "data"] } }), alasan);
});

test("a result whose freshness is unknown (no basi flag) cannot be printed either", () => {
  const { basi, ...tanpaFlag } = hasilSegar; // eslint-disable-line no-unused-vars
  assert.equal(alasanCetakNonaktif({ ...siap(), hasil: tanpaFlag }), ALASAN_CETAK.basi);
  assert.equal(alasanCetakNonaktif({ ...siap(), hasil: { ...hasilSegar, basi: null } }), ALASAN_CETAK.basi);
});

test("stale wins over a missing item: the first thing to do is recalculate", () => {
  assert.equal(alasanCetakNonaktif({ ...siap(), item: null, hasil: { ...hasilSegar, basi: true } }), ALASAN_CETAK.basi);
});

test("no pilihan, no result, a pilihan that left the result, and an unread profile each have their reason", () => {
  assert.equal(alasanCetakNonaktif({ ...siap(), pilihan: null }), ALASAN_CETAK.tanpaPilihan);
  assert.equal(alasanCetakNonaktif({ ...siap(), hasil: null, item: null }), ALASAN_CETAK.tanpaHasil);
  assert.equal(alasanCetakNonaktif({ ...siap(), item: null }), ALASAN_CETAK.tempatHilang);
  assert.equal(alasanCetakNonaktif({ ...siap(), profil: null }), ALASAN_CETAK.tanpaProfil);
  assert.equal(alasanCetakNonaktif({ ...siap(), profil: {} }), ALASAN_CETAK.tanpaProfil);
});
