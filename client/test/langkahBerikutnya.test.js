import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LANGKAH,
  TUJUAN,
  hasilBasi,
  langkahBerikutnya,
  ringkasProfil,
} from "../src/features/beranda/langkahBerikutnya.js";

const daftar = ["K01", "K02", "K03", "K04"].map((kompetensi_id) => ({ kompetensi_id }));
const jawaban = (...ids) => ids.map((kompetensi_id) => ({ kompetensi_id, level_penguasaan: 2 }));

const profilLengkap = {
  status: "Lengkap",
  ipk: 3.6,
  minat_bidang: "Web",
  domisili: { kota: "Manado" },
  jumlah_proyek: 2,
  jumlah_sertifikasi: 0,
  kompetensi: jawaban("K01", "K02", "K03", "K04"),
  diperbarui_pada: "2026-11-20T10:00:00.000Z",
};
const profilDraf = { ...profilLengkap, status: "Draf", ipk: null, kompetensi: jawaban("K01", "K03") };
const hasilSegar = { basi: false, penyebabBasi: [], ranking: [{ id: "T05" }] };
const hasilBasiData = { ...hasilSegar, basi: true, penyebabBasi: ["data"] };
const pilihan = { tempat_id: "T05", namaPerusahaan: "PT Contoh" };

const kode = (...args) => langkahBerikutnya(...args).kode;

// ---- the five situations -------------------------------------------------------------------

test("a profile that is not Lengkap: finish it, with what is missing and a link to the first empty answer", () => {
  const kelengkapan = ringkasProfil(profilDraf, daftar);
  const langkah = langkahBerikutnya(profilDraf, null, null, kelengkapan);
  assert.equal(langkah.kode, LANGKAH.lengkapiProfil);
  assert.equal(langkah.judul, "Lengkapi profil kompetensimu");
  assert.equal(langkah.keterangan, "Masih kurang 2 kompetensi dan data pendukung: IPK.");
  assert.deepEqual(langkah.tombol, { label: "Lengkapi profil", ke: `${TUJUAN.profil}?fokus=K02` });
});

test("a Draf profile whose kompetensi are all answered links to the profile without a focus", () => {
  const draf = { ...profilLengkap, status: "Draf", minat_bidang: null };
  const langkah = langkahBerikutnya(draf, null, null, ringkasProfil(draf, daftar));
  assert.equal(langkah.kode, LANGKAH.lengkapiProfil);
  assert.equal(langkah.keterangan, "Masih kurang data pendukung: Bidang minat.");
  assert.equal(langkah.tombol.ke, TUJUAN.profil);
});

test("without the optional completeness summary the first step still works", () => {
  const langkah = langkahBerikutnya(profilDraf, null, null);
  assert.equal(langkah.kode, LANGKAH.lengkapiProfil);
  assert.equal(langkah.tombol.ke, TUJUAN.profil);
  assert.ok(langkah.keterangan.length > 0);
});

test("a Lengkap profile and no result yet: ask for the first recommendation", () => {
  const langkah = langkahBerikutnya(profilLengkap, null, null);
  assert.equal(langkah.kode, LANGKAH.mintaRekomendasi);
  assert.equal(langkah.judul, "Minta rekomendasi pertamamu");
  assert.equal(langkah.tombol.ke, TUJUAN.rekomendasi);
});

test("a stale result: calculate again", () => {
  const langkah = langkahBerikutnya(profilLengkap, hasilBasiData, null);
  assert.equal(langkah.kode, LANGKAH.hitungUlang);
  assert.equal(langkah.judul, "Data berubah. Hitung ulang rekomendasimu");
  assert.equal(langkah.tombol.ke, TUJUAN.rekomendasi);
});

test("a fresh result and no pilihan: choose one tempat magang", () => {
  const langkah = langkahBerikutnya(profilLengkap, hasilSegar, null);
  assert.equal(langkah.kode, LANGKAH.pilihTempat);
  assert.equal(langkah.judul, "Pilih satu tempat magang");
  assert.equal(langkah.tombol.ke, TUJUAN.rekomendasi);
});

test("a pilihan and a fresh result: print the summary for the koordinator", () => {
  const langkah = langkahBerikutnya(profilLengkap, hasilSegar, pilihan);
  assert.equal(langkah.kode, LANGKAH.cetakRingkasan);
  assert.equal(langkah.judul, "Cetak ringkasan untuk koordinator");
  assert.equal(langkah.tombol.ke, TUJUAN.pilihan);
});

// ---- the order of priority -----------------------------------------------------------------

test("an unfinished profile wins over everything that comes after it", () => {
  assert.equal(kode(profilDraf, hasilSegar, pilihan), LANGKAH.lengkapiProfil);
  assert.equal(kode(profilDraf, hasilBasiData, pilihan), LANGKAH.lengkapiProfil);
  assert.equal(kode(profilDraf, null, pilihan), LANGKAH.lengkapiProfil);
  assert.equal(kode(null, null, null), LANGKAH.lengkapiProfil);
});

test("a stale result wins over choosing and over printing, even with a pilihan saved", () => {
  assert.equal(kode(profilLengkap, hasilBasiData, null), LANGKAH.hitungUlang);
  assert.equal(kode(profilLengkap, hasilBasiData, pilihan), LANGKAH.hitungUlang);
});

test("no result comes before a pilihan: a saved pilihan without a result still asks for a recommendation", () => {
  assert.equal(kode(profilLengkap, null, pilihan), LANGKAH.mintaRekomendasi);
});

test("choosing comes before printing", () => {
  assert.equal(kode(profilLengkap, hasilSegar, null), LANGKAH.pilihTempat);
  assert.equal(kode(profilLengkap, hasilSegar, pilihan), LANGKAH.cetakRingkasan);
});

test("every step has a distinct code and a button that goes somewhere", () => {
  const semua = [
    langkahBerikutnya(profilDraf, null, null),
    langkahBerikutnya(profilLengkap, null, null),
    langkahBerikutnya(profilLengkap, hasilBasiData, null),
    langkahBerikutnya(profilLengkap, hasilSegar, null),
    langkahBerikutnya(profilLengkap, hasilSegar, pilihan),
  ];
  assert.equal(new Set(semua.map((l) => l.kode)).size, 5);
  for (const l of semua) {
    assert.ok(l.judul && l.keterangan && l.tombol.label);
    assert.match(l.tombol.ke, /^\/mahasiswa\//);
  }
});

// ---- stale detection -----------------------------------------------------------------------

test("hasilBasi follows the server's basi flag", () => {
  assert.equal(hasilBasi(hasilSegar, profilLengkap), false);
  assert.equal(hasilBasi(hasilBasiData, profilLengkap), true);
  assert.equal(hasilBasi(null, profilLengkap), false);
});

test("without a basi flag the profile's timestamp decides", () => {
  const lama = { profilDiperbaruiPada: "2026-11-01T00:00:00.000Z" };
  const baru = { profilDiperbaruiPada: "2026-11-25T00:00:00.000Z" };
  assert.equal(hasilBasi(lama, profilLengkap), true);
  assert.equal(hasilBasi(baru, profilLengkap), false);
  assert.equal(hasilBasi(lama, null), false);
  assert.equal(langkahBerikutnya(profilLengkap, lama, null).kode, LANGKAH.hitungUlang);
});

// ---- ringkasProfil -------------------------------------------------------------------------

test("ringkasProfil counts the answers, the percentage and the supporting data", () => {
  const r = ringkasProfil(profilDraf, daftar);
  assert.equal(r.total, 4);
  assert.equal(r.terisi, 2);
  assert.equal(r.persen, 50);
  assert.deepEqual(r.kosongIds, ["K02", "K04"]);
  assert.deepEqual(r.dataKurang, ["IPK"]);
  assert.deepEqual(
    r.data.map((d) => [d.nama, d.terisi]),
    [
      ["IPK", false],
      ["Bidang minat", true],
      ["Kota domisili", true],
      ["Proyek dan sertifikasi", true],
    ],
  );
});

test("an answer of level 0 (Belum punya) counts as answered, and 0 projects is a real answer", () => {
  const profil = { ...profilLengkap, jumlah_proyek: 0, jumlah_sertifikasi: 0, kompetensi: [{ kompetensi_id: "K01", level_penguasaan: 0 }] };
  const r = ringkasProfil(profil, daftar);
  assert.equal(r.terisi, 1);
  assert.equal(r.dataKurang.length, 0);
});

test("projects and certifications are one item: both counts must be filled", () => {
  assert.deepEqual(ringkasProfil({ ...profilLengkap, jumlah_sertifikasi: null }, daftar).dataKurang, ["Proyek dan sertifikasi"]);
  assert.deepEqual(ringkasProfil({ ...profilLengkap, jumlah_proyek: null }, daftar).dataKurang, ["Proyek dan sertifikasi"]);
});

test("ringkasProfil copes with an empty profile and an empty kompetensi list", () => {
  const kosong = ringkasProfil({ kompetensi: [] }, daftar);
  assert.equal(kosong.terisi, 0);
  assert.equal(kosong.persen, 0);
  assert.equal(kosong.dataKurang.length, 4);
  assert.equal(ringkasProfil(null, []).persen, 0);
  assert.equal(ringkasProfil(profilLengkap, daftar).persen, 100);
});
