/**
 * Validation for self-registration (POST /api/auth/daftar) and the identity fields
 * the profile page may change (nama, angkatan). Pure functions: no database, no I/O.
 *
 * validasiDaftar returns { data, kesalahan }: `kesalahan` maps a field to a plain-
 * Indonesian message (empty when the input is fine); the service turns it into
 * 422 { error, kesalahan }. Only the whitelisted fields are ever read: a `role`,
 * `status` or `mahasiswa_id` in the body never reaches `data`.
 */
export const NAMA_MAKS = 255;
export const NIM_MIN = 8;
export const NIM_MAKS = 15;
export const ANGKATAN_MAKS_TUA = 10; // years before the current one
export const PASSWORD_MIN = 8;
export const PASSWORD_MAKS = 128;
export const EMAIL_MAKS = 254;

export const TEKS_PERSETUJUAN =
  'Saya bersedia data profil saya digunakan untuk keperluan penelitian skripsi ini. Identitas saya tidak akan dipublikasikan.';

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalisasiEmail = (value) => String(value ?? '').trim().toLowerCase();
const rapikanSpasi = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

/** { nilai, pesan }: the cleaned name, or null with a message. */
export function periksaNama(value) {
  if (typeof value !== 'string') return { nilai: null, pesan: 'Isi nama lengkap.' };
  const nilai = rapikanSpasi(value);
  if (nilai === '') return { nilai: null, pesan: 'Isi nama lengkap.' };
  if (nilai.length > NAMA_MAKS) return { nilai: null, pesan: `Nama paling banyak ${NAMA_MAKS} karakter.` };
  return { nilai, pesan: null };
}

/** { nilai, pesan }: the angkatan as a number, or null with a message. */
export function periksaAngkatan(value, sekarang = new Date()) {
  const tahunIni = sekarang.getFullYear();
  // nothing chosen (empty, spaces only, null, undefined) is told apart from a wrong value
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return { nilai: null, pesan: 'Pilih angkatan.' };
  }
  const teks = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!/^\d{4}$/.test(teks)) return { nilai: null, pesan: 'Angkatan berupa tahun 4 digit, misalnya 2023.' };
  const nilai = Number(teks);
  if (nilai > tahunIni) return { nilai: null, pesan: `Angkatan tidak boleh melebihi ${tahunIni}.` };
  if (nilai < tahunIni - ANGKATAN_MAKS_TUA) {
    return { nilai: null, pesan: `Angkatan paling lama ${tahunIni - ANGKATAN_MAKS_TUA}.` };
  }
  return { nilai, pesan: null };
}

/**
 * @param {object} input
 * @param {{ sekarang?: Date }} [opsi]
 */
export function validasiDaftar(input, { sekarang = new Date() } = {}) {
  const kesalahan = {};
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  const nama = periksaNama(body.nama);
  if (nama.pesan) kesalahan.nama = nama.pesan;

  // NIM: a string of digits only (a number would lose leading zeros)
  let nim = null;
  const teksNim = typeof body.nim === 'string' ? body.nim.trim() : '';
  if (teksNim === '') kesalahan.nim = 'Isi NIM.';
  else if (!/^\d+$/.test(teksNim)) kesalahan.nim = 'NIM hanya boleh berisi angka.';
  else if (teksNim.length < NIM_MIN || teksNim.length > NIM_MAKS) kesalahan.nim = `NIM terdiri dari ${NIM_MIN} sampai ${NIM_MAKS} angka.`;
  else nim = teksNim;

  const angkatan = periksaAngkatan(body.angkatan, sekarang);
  if (angkatan.pesan) kesalahan.angkatan = angkatan.pesan;

  const email = normalisasiEmail(body.email);
  if (email === '') kesalahan.email = 'Isi email.';
  else if (email.length > EMAIL_MAKS || !POLA_EMAIL.test(email)) kesalahan.email = 'Tulis email yang benar, misalnya nama@email.com.';

  const password = typeof body.password === 'string' ? body.password : '';
  if (password === '') kesalahan.password = 'Isi kata sandi.';
  else if (password.length < PASSWORD_MIN) kesalahan.password = `Kata sandi minimal ${PASSWORD_MIN} karakter.`;
  else if (password.length > PASSWORD_MAKS) kesalahan.password = `Kata sandi paling banyak ${PASSWORD_MAKS} karakter.`;
  else if (password.trim().toLowerCase() === email || (nim !== null && password.trim() === nim)) {
    kesalahan.password = 'Kata sandi tidak boleh sama dengan email atau NIM.';
  }

  const konfirmasi = typeof body.konfirmasi === 'string' ? body.konfirmasi : '';
  if (!kesalahan.password) {
    if (konfirmasi === '') kesalahan.konfirmasi = 'Ulangi kata sandi.';
    else if (password !== konfirmasi) kesalahan.konfirmasi = 'Konfirmasi kata sandi belum sama.';
  }

  // consent: exactly the boolean true
  if (body.setuju !== true) kesalahan.setuju = 'Centang persetujuan ini untuk mendaftar.';

  return {
    data: { nama: nama.nilai, nim, angkatan: angkatan.nilai, email: email || null, password },
    kesalahan,
  };
}
