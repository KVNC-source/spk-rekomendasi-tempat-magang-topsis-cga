/**
 * Validation for the administrator forms. Pure functions: no database, no I/O,
 * so every rule can be tested directly.
 *
 * Each validator returns { data, kesalahan }. `kesalahan` maps a field name to a
 * message in plain Indonesian (empty when the input is fine); the service turns
 * it into 422 { error, kesalahan }.
 */
import { BIDANG, POLA_REMOTE } from '../engine/src/config.js';

/** Batasan 3 of the thesis: a lowongan must be in Indonesia. */
export const BATAS_INDONESIA = { latMin: -11.5, latMax: 6.5, lonMin: 94.5, lonMax: 141.5 };

export const STATUS_ALTERNATIF = ['Dipakai', 'Dikeluarkan'];
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 4;
export const SKALA_KOMPETENSI = 4; // fixed: levels 0-4; not editable from the admin pages

const POLA_KODE_TEMPAT = /^T\d{2,8}$/;
const POLA_KODE_KOMPETENSI = /^K\d{2,8}$/;

const fmt = (n) => String(n).replace('.', ',');

/** Trimmed text, or null when empty / not a string. */
const teks = (value) => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

/** "  Web   Dev " -> "web dev": for comparing names without caring about case or spacing. */
export const normalisasiNama = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * A number from a JSON number or a numeric string.
 * Returns null when empty, NaN when it is not a number.
 */
function angka(value) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value === 'string' && /^-?\d+([.,]\d+)?$/.test(value.trim())) return Number(value.trim().replace(',', '.'));
  return Number.NaN;
}

const punyaDesimalMaks = (n, desimal) => Math.abs(n * 10 ** desimal - Math.round(n * 10 ** desimal)) < 1e-7;

/** The next free code: prefix + a two-digit-or-longer number one above the highest used. */
export function kodeBerikutnya(prefix, daftarKode) {
  const pola = new RegExp(`^${prefix}(\\d+)$`);
  const tertinggi = daftarKode.reduce((max, kode) => {
    const cocok = pola.exec(kode);
    return cocok ? Math.max(max, Number(cocok[1])) : max;
  }, 0);
  return `${prefix}${String(tertinggi + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- tempat magang

/**
 * @param {object} input     the request body
 * @param {object} opsi
 * @param {Set<string>} opsi.kodeKompetensi  codes that exist in the kompetensi table
 * @param {'baru'|'ubah'} opsi.mode
 * @param {Date} [opsi.sekarang]
 */
export function validasiTempat(input, { kodeKompetensi, mode, sekarang = new Date() }) {
  const kesalahan = {};
  const salah = (field, pesan) => {
    if (!kesalahan[field]) kesalahan[field] = pesan;
  };
  const body = input && typeof input === 'object' ? input : {};

  // kode_tempat: chosen when the tempat is created, never changed afterwards
  const kode = teks(body.kode_tempat);
  if (mode === 'baru' && kode !== null && !POLA_KODE_TEMPAT.test(kode)) {
    salah('kode_tempat', 'Kode harus diawali T dan diikuti angka, misalnya T18.');
  }

  const nama = teks(body.nama_perusahaan);
  if (!nama) salah('nama_perusahaan', 'Isi nama perusahaan.');
  else if (nama.length > 255) salah('nama_perusahaan', 'Nama perusahaan maksimal 255 karakter.');

  const posisi = teks(body.posisi);
  if (!posisi) salah('posisi', 'Isi posisi magang.');
  else if (posisi.length > 255) salah('posisi', 'Posisi maksimal 255 karakter.');

  const bidang = teks(body.bidang_industri);
  if (!bidang) salah('bidang_industri', 'Pilih bidang industri.');
  else if (!BIDANG.includes(bidang)) {
    salah('bidang_industri', `Bidang tidak dikenal. Pilih salah satu: ${BIDANG.join(', ')}.`);
  }

  const lokasi = teks(body.lokasi);
  if (!lokasi) salah('lokasi', 'Isi lokasi.');
  else if (lokasi.length > 255) salah('lokasi', 'Lokasi maksimal 255 karakter.');

  // coordinates: both or none, inside Indonesia, at most 6 decimals
  const lat = angka(body.latitude);
  const lon = angka(body.longitude);
  if (Number.isNaN(lat)) salah('latitude', 'Garis lintang harus berupa angka, misalnya -6,2615.');
  if (Number.isNaN(lon)) salah('longitude', 'Garis bujur harus berupa angka, misalnya 106,8106.');
  if (!Number.isNaN(lat) && !Number.isNaN(lon) && (lat === null) !== (lon === null)) {
    salah(lat === null ? 'latitude' : 'longitude', 'Isi garis lintang dan garis bujur bersama-sama, atau kosongkan keduanya.');
  }
  if (typeof lat === 'number' && !Number.isNaN(lat)) {
    if (lat < BATAS_INDONESIA.latMin || lat > BATAS_INDONESIA.latMax) {
      salah('latitude', `Garis lintang di luar wilayah Indonesia. Harus antara ${fmt(BATAS_INDONESIA.latMin)} dan ${fmt(BATAS_INDONESIA.latMax)} (Batasan 3).`);
    } else if (!punyaDesimalMaks(lat, 6)) salah('latitude', 'Garis lintang maksimal 6 angka di belakang koma.');
  }
  if (typeof lon === 'number' && !Number.isNaN(lon)) {
    if (lon < BATAS_INDONESIA.lonMin || lon > BATAS_INDONESIA.lonMax) {
      salah('longitude', `Garis bujur di luar wilayah Indonesia. Harus antara ${fmt(BATAS_INDONESIA.lonMin)} dan ${fmt(BATAS_INDONESIA.lonMax)} (Batasan 3).`);
    } else if (!punyaDesimalMaks(lon, 6)) salah('longitude', 'Garis bujur maksimal 6 angka di belakang koma.');
  }

  const modeKerja = teks(body.mode_kerja);
  if (modeKerja && modeKerja.length > 100) salah('mode_kerja', 'Mode kerja maksimal 100 karakter.');

  const benefit = angka(body.benefit_finansial);
  if (Number.isNaN(benefit)) salah('benefit_finansial', 'Benefit harus berupa angka (juta rupiah per bulan), atau kosongkan.');
  else if (benefit !== null) {
    if (benefit < 0) salah('benefit_finansial', 'Benefit tidak boleh negatif.');
    else if (benefit > 999999.99) salah('benefit_finansial', 'Benefit terlalu besar.');
    else if (!punyaDesimalMaks(benefit, 2)) salah('benefit_finansial', 'Benefit maksimal 2 angka di belakang koma.');
  }

  const reputasi = angka(body.reputasi);
  if (Number.isNaN(reputasi) || (reputasi !== null && (!Number.isInteger(reputasi) || reputasi < 1 || reputasi > 5))) {
    salah('reputasi', 'Reputasi harus bilangan bulat 1 sampai 5, atau kosongkan.');
  }

  const status = teks(body.status_alternatif);
  if (!STATUS_ALTERNATIF.includes(status)) salah('status_alternatif', 'Pilih status: Dipakai atau Dikeluarkan.');
  let alasan = teks(body.alasan_dikeluarkan);
  if (status === 'Dikeluarkan' && !alasan) salah('alasan_dikeluarkan', 'Tulis alasan tempat ini dikeluarkan.');
  if (status === 'Dipakai') alasan = null; // a lowongan in use has no reason for leaving

  const sumber = teks(body.sumber_url);
  if (sumber) {
    let ok = sumber.length <= 500;
    if (sumber.length > 500) salah('sumber_url', 'Tautan maksimal 500 karakter.');
    else {
      try {
        const url = new URL(sumber);
        ok = url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        ok = false;
      }
      if (!ok) salah('sumber_url', 'Tautan harus berupa alamat web yang diawali http:// atau https://.');
    }
  }

  const tanggal = teks(body.tanggal_akses);
  if (tanggal) {
    const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggal);
    const date = cocok ? new Date(`${tanggal}T00:00:00Z`) : null;
    const valid = date && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === tanggal;
    if (!valid) salah('tanggal_akses', 'Tanggal tidak valid. Pakai format tahun-bulan-tanggal, misalnya 2026-11-05.');
    else if (tanggal > sekarang.toISOString().slice(0, 10)) salah('tanggal_akses', 'Tanggal akses tidak boleh di masa depan.');
  }

  // kebutuhan kompetensi
  const kebutuhan = [];
  if (!Array.isArray(body.kebutuhan)) {
    salah('kebutuhan', 'Kirim daftar kebutuhan kompetensi (boleh kosong untuk tempat yang dikeluarkan).');
  } else {
    const terlihat = new Set();
    body.kebutuhan.forEach((item, i) => {
      const baris = item && typeof item === 'object' ? item : {};
      const kodeK = teks(baris.kompetensi);
      if (!kodeK || !kodeKompetensi.has(kodeK)) salah(`kebutuhan[${i}].kompetensi`, 'Pilih kompetensi yang ada di daftar.');
      else if (terlihat.has(kodeK)) salah(`kebutuhan[${i}].kompetensi`, 'Kompetensi ini sudah ada di daftar. Satu kompetensi hanya boleh sekali.');
      terlihat.add(kodeK);

      const level = angka(baris.level_minimum);
      if (level === null || Number.isNaN(level) || !Number.isInteger(level) || level < LEVEL_MIN || level > LEVEL_MAX) {
        salah(`kebutuhan[${i}].level_minimum`, `Level minimum harus bilangan bulat ${LEVEL_MIN} sampai ${LEVEL_MAX}.`);
      }
      if (typeof baris.wajib !== 'boolean') salah(`kebutuhan[${i}].wajib`, 'Pilih Wajib atau Opsional.');
      kebutuhan.push({ kompetensi: kodeK, level_minimum: level, wajib: baris.wajib });
    });
  }

  // rules for a tempat that takes part in the calculation (status Dipakai)
  if (status === 'Dipakai') {
    if (Array.isArray(body.kebutuhan) && !kebutuhan.some((k) => k.wajib === true)) {
      salah('kebutuhan', 'Tempat yang Dipakai butuh minimal satu kompetensi wajib.');
    }
    if (lat === null || lon === null) {
      salah('latitude', 'Tempat yang Dipakai harus punya koordinat. Tanpa itu jaraknya tidak bisa dihitung dan tempat ini tidak ikut dihitung.');
    }
    if (modeKerja && POLA_REMOTE.test(modeKerja)) {
      salah('mode_kerja', 'Lowongan remote/WFH tidak ikut dihitung (Batasan 3). Ubah mode kerja, atau pilih status Dikeluarkan.');
    }
  }

  return {
    kesalahan,
    kebutuhan,
    data: {
      kode_tempat: kode,
      nama_perusahaan: nama,
      posisi,
      bidang_industri: bidang,
      lokasi,
      latitude: lat,
      longitude: lon,
      mode_kerja: modeKerja,
      benefit_finansial: benefit,
      reputasi,
      status_alternatif: status,
      alasan_dikeluarkan: alasan,
      sumber_url: sumber,
      tanggal_akses: tanggal,
    },
  };
}

// ------------------------------------------------------------------- kompetensi

/**
 * @param {object} opsi
 * @param {string[]} opsi.namaLain  names of the OTHER kompetensi (for the uniqueness check)
 * @param {'baru'|'ubah'} opsi.mode
 */
export function validasiKompetensi(input, { namaLain, mode }) {
  const kesalahan = {};
  const body = input && typeof input === 'object' ? input : {};

  const nama = teks(body.nama_kompetensi);
  if (!nama) kesalahan.nama_kompetensi = 'Isi nama kompetensi.';
  else if (nama.length > 255) kesalahan.nama_kompetensi = 'Nama maksimal 255 karakter.';
  else if (namaLain.some((lain) => normalisasiNama(lain) === normalisasiNama(nama))) {
    kesalahan.nama_kompetensi = 'Sudah ada kompetensi dengan nama ini.';
  }

  const kategori = teks(body.kategori);
  if (!kategori) kesalahan.kategori = 'Isi kategori, atau pilih yang sudah ada.';
  else if (kategori.length > 100) kesalahan.kategori = 'Kategori maksimal 100 karakter.';

  const deskripsi = teks(body.deskripsi);
  if (deskripsi && deskripsi.length > 1000) kesalahan.deskripsi = 'Deskripsi maksimal 1000 karakter.';

  const kode = teks(body.kode_kompetensi);
  if (mode === 'baru' && kode !== null && !POLA_KODE_KOMPETENSI.test(kode)) {
    kesalahan.kode_kompetensi = 'Kode harus diawali K dan diikuti angka, misalnya K22.';
  }

  // skala_maksimum in the input is ignored on purpose: the scale is fixed at 0-4
  return {
    kesalahan,
    data: { kode_kompetensi: kode, nama_kompetensi: nama, kategori: kategori ? kategori.replace(/\s+/g, ' ') : null, deskripsi, skala_maksimum: SKALA_KOMPETENSI },
  };
}

// --------------------------------------------------------------------- kriteria

/**
 * Weights are compared as whole units of 1/10000 (the column holds 4 decimals),
 * never as floating point, so 0.1 + 0.2 + ... lands exactly on 1.0000 or not.
 *
 * @param {string[]} kodeKriteria  the criteria that exist, e.g. C1..C7
 */
export function validasiBobot(input, kodeKriteria) {
  const kesalahan = {};
  const peringatan = [];
  const bobot = {};
  const body = input && typeof input === 'object' && input.bobot && typeof input.bobot === 'object' ? input.bobot : null;
  if (!body || Array.isArray(body)) {
    return { kesalahan: { bobot: 'Kirim bobot untuk semua kriteria, misalnya { "bobot": { "C1": 0.3, ... } }.' }, bobot, peringatan, total: null };
  }

  for (const kode of Object.keys(body)) {
    if (!kodeKriteria.includes(kode)) kesalahan[kode] = `Kriteria ${kode} tidak dikenal.`;
  }

  let totalUnit = 0;
  let lengkap = true;
  for (const kode of kodeKriteria) {
    const nilai = angka(body[kode]);
    if (nilai === null) {
      kesalahan[kode] = 'Isi bobot kriteria ini.';
      lengkap = false;
    } else if (Number.isNaN(nilai)) {
      kesalahan[kode] = 'Bobot harus berupa angka, misalnya 0,25.';
      lengkap = false;
    } else if (nilai < 0 || nilai > 1) {
      kesalahan[kode] = 'Bobot harus antara 0 dan 1.';
      lengkap = false;
    } else if (!punyaDesimalMaks(nilai, 4)) {
      kesalahan[kode] = 'Bobot maksimal 4 angka di belakang koma.';
      lengkap = false;
    } else {
      const unit = Math.round(nilai * 10000);
      totalUnit += unit;
      bobot[kode] = unit / 10000;
      if (unit === 0) peringatan.push(`${kode}: bobot 0, kriteria ini tidak berpengaruh pada hasil.`);
    }
  }

  const total = lengkap ? totalUnit / 10000 : null;
  if (lengkap && totalUnit !== 10000) {
    kesalahan.total = `Total bobot ${fmt(total.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''))}, harus tepat 1,00.`;
  }
  return { kesalahan, bobot, peringatan, total };
}
