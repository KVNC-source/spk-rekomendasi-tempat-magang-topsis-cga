/**
 * Validation of the registration form, run in the browser before anything is sent.
 * Pure (no imports), so `node --test` can run it. The rules and the messages are the
 * same as the server's (server/src/services/validasi-daftar.js); client/test checks that
 * the two agree, so this copy cannot drift. The server is still the one that decides.
 */
export const TEKS_PERSETUJUAN =
  "Saya bersedia data profil saya digunakan untuk keperluan penelitian skripsi ini. Identitas saya tidak akan dipublikasikan.";

export const ANGKATAN_MAKS_TUA = 10;

/** The fields in the order they appear on the form (the first wrong one gets the focus). */
export const URUTAN_FIELD = ["nama", "nim", "angkatan", "email", "password", "konfirmasi", "setuju"];

/** The years offered for "Angkatan": this year back to ten years ago, newest first. */
export function pilihanAngkatan(sekarang = new Date()) {
  const tahunIni = sekarang.getFullYear();
  return Array.from({ length: ANGKATAN_MAKS_TUA + 1 }, (_, i) => tahunIni - i);
}

/** The message for a wrong name, or null. Used by the registration form and the profile page. */
export function pesanNama(nilai) {
  const bersih = String(nilai ?? "").trim().replace(/\s+/g, " ");
  if (bersih === "") return "Isi nama lengkap.";
  if (bersih.length > 255) return "Nama paling banyak 255 karakter.";
  return null;
}

/** The message for a wrong angkatan, or null. */
export function pesanAngkatan(nilai, sekarang = new Date()) {
  const tahunIni = sekarang.getFullYear();
  const teks = String(nilai ?? "").trim();
  // nothing chosen is told apart from a wrong value
  if (teks === "") return "Pilih angkatan.";
  if (!/^\d{4}$/.test(teks)) return "Angkatan berupa tahun 4 digit, misalnya 2023.";
  const tahun = Number(teks);
  if (tahun > tahunIni) return `Angkatan tidak boleh melebihi ${tahunIni}.`;
  if (tahun < tahunIni - ANGKATAN_MAKS_TUA) return `Angkatan paling lama ${tahunIni - ANGKATAN_MAKS_TUA}.`;
  return null;
}

/**
 * @param {{ nama: string, nim: string, angkatan: string, email: string, password: string, konfirmasi: string, setuju: boolean }} form
 * @returns {Record<string, string>} field -> message; empty when the form is fine
 */
export function validasiFormDaftar(form, sekarang = new Date()) {
  const kesalahan = {};

  const nama = pesanNama(form.nama);
  if (nama) kesalahan.nama = nama;

  const nim = String(form.nim ?? "").trim();
  if (nim === "") kesalahan.nim = "Isi NIM.";
  else if (!/^\d+$/.test(nim)) kesalahan.nim = "NIM hanya boleh berisi angka.";
  else if (nim.length < 8 || nim.length > 15) kesalahan.nim = "NIM terdiri dari 8 sampai 15 angka.";

  const angkatan = pesanAngkatan(form.angkatan, sekarang);
  if (angkatan) kesalahan.angkatan = angkatan;

  const email = String(form.email ?? "").trim().toLowerCase();
  if (email === "") kesalahan.email = "Isi email.";
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    kesalahan.email = "Tulis email yang benar, misalnya nama@email.com.";
  }

  const password = String(form.password ?? "");
  if (password === "") kesalahan.password = "Isi kata sandi.";
  else if (password.length < 8) kesalahan.password = "Kata sandi minimal 8 karakter.";
  else if (password.length > 128) kesalahan.password = "Kata sandi paling banyak 128 karakter.";
  else if (password.trim().toLowerCase() === email || password.trim() === nim) {
    kesalahan.password = "Kata sandi tidak boleh sama dengan email atau NIM.";
  }

  const konfirmasi = String(form.konfirmasi ?? "");
  if (!kesalahan.password) {
    if (konfirmasi === "") kesalahan.konfirmasi = "Ulangi kata sandi.";
    else if (password !== konfirmasi) kesalahan.konfirmasi = "Konfirmasi kata sandi belum sama.";
  }

  if (form.setuju !== true) kesalahan.setuju = "Centang persetujuan ini untuk mendaftar.";

  return kesalahan;
}
