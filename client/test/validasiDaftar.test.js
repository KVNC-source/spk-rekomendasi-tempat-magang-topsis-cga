import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TEKS_PERSETUJUAN,
  URUTAN_FIELD,
  pesanAngkatan,
  pesanNama,
  pilihanAngkatan,
  validasiFormDaftar,
} from "../src/features/auth/validasiDaftar.js";
// The server's validator: the browser's copy must agree with it on every case below.
import { TEKS_PERSETUJUAN as TEKS_SERVER, validasiDaftar } from "../../server/src/services/validasi-daftar.js";

const SEKARANG = new Date("2026-11-21T03:00:00.000Z");
const sah = () => ({
  nama: "Keefa Noah Lasut",
  nim: "230211060068",
  angkatan: "2023",
  email: "keefa@example.invalid",
  password: "rahasia-banget",
  konfirmasi: "rahasia-banget",
  setuju: true,
});

test("a valid form has no errors", () => {
  assert.deepEqual(validasiFormDaftar(sah(), SEKARANG), {});
});

test("each rule reports its own field", () => {
  const cek = (ubah) => Object.keys(validasiFormDaftar({ ...sah(), ...ubah }, SEKARANG));
  assert.deepEqual(cek({ nama: "  " }), ["nama"]);
  assert.deepEqual(cek({ nim: "1234567" }), ["nim"]);
  assert.deepEqual(cek({ nim: "23021106A068" }), ["nim"]);
  assert.deepEqual(cek({ angkatan: "2027" }), ["angkatan"]);
  assert.deepEqual(cek({ angkatan: "2015" }), ["angkatan"]);
  assert.deepEqual(cek({ email: "bukan-email" }), ["email"]);
  assert.deepEqual(cek({ password: "pendek", konfirmasi: "pendek" }), ["password"]);
  assert.deepEqual(cek({ password: "230211060068", konfirmasi: "230211060068" }), ["password"]);
  assert.deepEqual(cek({ password: "KEEFA@example.invalid", konfirmasi: "KEEFA@example.invalid" }), ["password"]);
  assert.deepEqual(cek({ konfirmasi: "beda-sekali" }), ["konfirmasi"]);
  assert.deepEqual(cek({ konfirmasi: "" }), ["konfirmasi"]);
  assert.deepEqual(cek({ setuju: false }), ["setuju"]);
});

test("the angkatan choices run from this year back ten years, newest first", () => {
  const tahun = pilihanAngkatan(SEKARANG);
  assert.equal(tahun.length, 11);
  assert.equal(tahun[0], 2026);
  assert.equal(tahun.at(-1), 2016);
  for (const t of tahun) assert.equal(pesanAngkatan(String(t), SEKARANG), null);
  assert.ok(pesanAngkatan("2027", SEKARANG) && pesanAngkatan("2015", SEKARANG));
});

test("angkatan: nothing chosen says \"Pilih angkatan.\"; a wrong value keeps the 4-digit message", () => {
  for (const kosong of ["", "   ", undefined, null]) assert.equal(pesanAngkatan(kosong, SEKARANG), "Pilih angkatan.", JSON.stringify(kosong));
  assert.equal(validasiFormDaftar({ ...sah(), angkatan: "" }, SEKARANG).angkatan, "Pilih angkatan.");
  for (const salah of ["20x3", "23", "dua"]) assert.equal(pesanAngkatan(salah, SEKARANG), "Angkatan berupa tahun 4 digit, misalnya 2023.");
  assert.match(pesanAngkatan("2027", SEKARANG), /melebihi 2026/);
  assert.match(pesanAngkatan("2015", SEKARANG), /paling lama 2016/);
});

test("pesanNama is shared with the profile page: empty and over 255 are wrong, spaces do not count", () => {
  assert.ok(pesanNama(""));
  assert.ok(pesanNama("     "));
  assert.ok(pesanNama("a".repeat(256)));
  assert.equal(pesanNama("a".repeat(255)), null);
  assert.equal(pesanNama("  Nama   Baik  "), null);
});

test("every field name belongs to the form order, and the consent text is the server's", () => {
  const { kesalahan } = validasiDaftar({}, { sekarang: SEKARANG });
  for (const field of Object.keys(kesalahan)) assert.ok(URUTAN_FIELD.includes(field), field);
  assert.equal(TEKS_PERSETUJUAN, TEKS_SERVER);
});

test("the browser and the server agree: same invalid fields and same messages for every case", () => {
  const kasus = [
    {},
    { nama: "" }, { nama: "a".repeat(256) }, { nama: "  Rapi   Sekali " },
    { nim: "" }, { nim: "1234567" }, { nim: "1".repeat(16) }, { nim: "12345678" }, { nim: "1".repeat(15) }, { nim: "12 345 678" }, { nim: "ABCDEFGH" },
    { angkatan: "" }, { angkatan: "   " }, { angkatan: "2027" }, { angkatan: "2026" }, { angkatan: "2016" }, { angkatan: "2015" }, { angkatan: "23" }, { angkatan: "dua" },
    { email: "" }, { email: "a@b" }, { email: "a@b.co" }, { email: "a b@c.com" }, { email: " Besar@Contoh.INVALID " },
    { password: "", konfirmasi: "" }, { password: "1234567", konfirmasi: "1234567" }, { password: "12345678", konfirmasi: "12345678" },
    { password: "a".repeat(128), konfirmasi: "a".repeat(128) }, { password: "a".repeat(129), konfirmasi: "a".repeat(129) },
    { password: "230211060068", konfirmasi: "230211060068" },
    { password: "keefa@example.invalid", konfirmasi: "keefa@example.invalid" },
    { konfirmasi: "" }, { konfirmasi: "lain-sekali" },
    { setuju: false }, { setuju: true },
  ];
  for (const ubah of kasus) {
    const form = { ...sah(), ...ubah };
    const klien = validasiFormDaftar(form, SEKARANG);
    const server = validasiDaftar({ ...form }, { sekarang: SEKARANG }).kesalahan;
    assert.deepEqual(klien, server, `form ${JSON.stringify(ubah)}`);
  }
});
