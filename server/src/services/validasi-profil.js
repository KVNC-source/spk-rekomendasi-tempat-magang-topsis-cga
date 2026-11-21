/**
 * Validation for PUT /api/mahasiswa/me/profil. A pure function: no database, no I/O.
 *
 * A draft is accepted: every data field may be empty (null) and the kompetensi
 * list may be partial. A value that IS given must be valid. Completeness
 * ("Lengkap") is decided separately, when the profile is read.
 *
 * `nama` and `angkatan` are optional: when they are not sent the saved values stay as
 * they are. The NIM is never read, so it cannot be changed here.
 *
 * Returns { data, kesalahan }; `kesalahan` maps a field name to a plain-Indonesian
 * message and is empty when the input is fine (the service turns it into
 * 422 { error, kesalahan }, the same shape as the administrator forms).
 */
import { BIDANG } from '../engine/src/config.js';
import { cariKota } from '../lib/kotaDomisili.js';
import { periksaAngkatan, periksaNama } from './validasi-daftar.js';

export const IPK_MIN = 0;
export const IPK_MAX = 4;
export const JUMLAH_MAKS = 99;

const kosong = (value) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

/** A number from a JSON number or a numeric string; NaN when it is not one. */
function angka(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value === 'string' && /^-?\d+([.,]\d+)?$/.test(value.trim())) return Number(value.trim().replace(',', '.'));
  return Number.NaN;
}

const bulat = (value) => {
  const n = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value;
  return Number.isInteger(n) ? n : Number.NaN;
};

/**
 * @param {object} input
 * @param {Map<string, number>} kompetensi  kode_kompetensi -> skala_maksimum, from the kompetensi table
 * @param {{ sekarang?: Date }} [opsi]
 */
export function validasiProfil(input, kompetensi, { sekarang = new Date() } = {}) {
  const kesalahan = {};
  const salah = (field, pesan) => {
    if (!kesalahan[field]) kesalahan[field] = pesan;
  };
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  // identity fields the mahasiswa may change: only when they are sent
  let nama;
  if (body.nama !== undefined) {
    const hasil = periksaNama(body.nama);
    if (hasil.pesan) salah('nama', hasil.pesan);
    else nama = hasil.nilai;
  }
  let angkatan;
  if (body.angkatan !== undefined) {
    const hasil = periksaAngkatan(body.angkatan, sekarang);
    if (hasil.pesan) salah('angkatan', hasil.pesan);
    else angkatan = hasil.nilai;
  }

  // IPK: 0-4, at most two decimals
  let ipk = null;
  if (!kosong(body.ipk)) {
    const n = angka(body.ipk);
    if (Number.isNaN(n)) salah('ipk', 'IPK harus berupa angka, misalnya 3,45.');
    else if (n < IPK_MIN || n > IPK_MAX) salah('ipk', 'IPK harus antara 0 dan 4.');
    else if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-7) salah('ipk', 'IPK ditulis dengan maksimal dua angka di belakang koma.');
    else ipk = Math.round(n * 100) / 100;
  }

  // minat bidang: one of the engine's BIDANG values
  let minat = null;
  if (!kosong(body.minat_bidang)) {
    const nilai = typeof body.minat_bidang === 'string' ? body.minat_bidang.trim() : '';
    if (!BIDANG.includes(nilai)) salah('minat_bidang', 'Pilih salah satu bidang minat dari daftar.');
    else minat = nilai;
  }

  // domisili: only the kota name is read; the coordinates always come from the master list
  let domisili = null;
  if (body.domisili !== null && body.domisili !== undefined) {
    const nama = typeof body.domisili === 'object' ? body.domisili.kota : body.domisili;
    const kota = typeof nama === 'string' ? cariKota(nama) : undefined;
    if (!kota) salah('domisili', 'Pilih kota domisili dari daftar.');
    else domisili = kota;
  }

  const hitungJumlah = (field, kata) => {
    if (kosong(body[field])) return null;
    const n = bulat(body[field]);
    if (Number.isNaN(n) || n < 0) {
      salah(field, `Jumlah ${kata} harus berupa bilangan bulat, 0 atau lebih.`);
      return null;
    }
    if (n > JUMLAH_MAKS) {
      salah(field, `Jumlah ${kata} paling banyak ${JUMLAH_MAKS}.`);
      return null;
    }
    return n;
  };
  const jumlahProyek = hitungJumlah('jumlah_proyek', 'proyek');
  const jumlahSertifikasi = hitungJumlah('jumlah_sertifikasi', 'sertifikasi');

  // kompetensi: the FULL set of answers; one that is not listed counts as not answered
  const jawaban = [];
  if (!Array.isArray(body.kompetensi)) {
    salah('kompetensi', 'Kirim daftar jawaban kompetensi (boleh kosong).');
  } else {
    const dilihat = new Set();
    for (const item of body.kompetensi) {
      const kode = typeof item?.kompetensi_id === 'string' ? item.kompetensi_id.trim() : '';
      if (!kompetensi.has(kode)) {
        salah('kompetensi', `Kompetensi ${kode || '(tanpa kode)'} tidak dikenal.`);
        continue;
      }
      if (dilihat.has(kode)) {
        salah('kompetensi', `Kompetensi ${kode} dikirim lebih dari sekali.`);
        continue;
      }
      dilihat.add(kode);
      const level = bulat(item.level_penguasaan);
      const skala = kompetensi.get(kode);
      if (Number.isNaN(level) || level < 0 || level > skala) {
        salah('kompetensi', `Level kompetensi ${kode} harus bilangan bulat 0 sampai ${skala}.`);
        continue;
      }
      jawaban.push({ kode, level });
    }
  }

  return {
    data: { ...(nama !== undefined && { nama }), ...(angkatan !== undefined && { angkatan }), ipk, minat_bidang: minat, domisili, jumlah_proyek: jumlahProyek, jumlah_sertifikasi: jumlahSertifikasi, kompetensi: jawaban },
    kesalahan,
  };
}
