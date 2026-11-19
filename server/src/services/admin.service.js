/**
 * Business Logic Layer — administrator: reference data of the system.
 *
 *  kriteria TOPSIS   weights C1-C7 (must total exactly 1.00)
 *  kompetensi        name, kategori, deskripsi (the 0-4 scale is fixed)
 *  tempat magang     the lowongan with its kebutuhan kompetensi, saved together
 *
 * Tempat and kompetensi are addressed by their public code (T05, K05).
 * What the Administrator saves is what POST /api/rekomendasi reads on its next
 * call: kriteria_topsis, tempat_magang and kompetensi are read per request.
 */
import { BIDANG } from '../engine/src/config.js';
import { HttpError } from '../lib/httpError.js';
import {
  BATAS_INDONESIA,
  STATUS_ALTERNATIF,
  kodeBerikutnya,
  validasiBobot,
  validasiKompetensi,
  validasiTempat,
} from './validasi-admin.js';

const num = (value) => (value === null || value === undefined ? null : Number(value));
const isoDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);
const urutKode = (a, b) => Number(a.kode_kompetensi.slice(1)) - Number(b.kode_kompetensi.slice(1));

const CATATAN_BOBOT = 'Bobot sementara, menunggu validasi pakar.';
const MODE_KERJA_SARAN = ['On-site', 'Hybrid', 'Remote/WFH', 'Tidak dinyatakan'];

const tolakJikaSalah = (kesalahan) => {
  if (Object.keys(kesalahan).length > 0) throw new HttpError(422, 'Data belum valid. Periksa bagian yang ditandai.', { kesalahan });
};

/** tempat_magang row (with kebutuhan and usage counts) -> what the admin pages get. */
export function ubahKeTempatAdmin(row) {
  const kebutuhan = row.kebutuhan_kompetensi.map((k) => ({
    kompetensi: k.kompetensi.kode_kompetensi,
    nama_kompetensi: k.kompetensi.nama_kompetensi,
    level_minimum: k.level_minimum,
    wajib: k.is_mandatory,
  }));
  const terpakai = { hasil: row._count.hasil_cga, pilihan: row._count.pilihan };
  return {
    kode_tempat: row.kode_tempat,
    nama_perusahaan: row.nama_perusahaan,
    posisi: row.posisi,
    bidang_industri: row.bidang_industri,
    lokasi: row.lokasi,
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    mode_kerja: row.mode_kerja ?? null,
    benefit_finansial: num(row.benefit_finansial),
    reputasi: row.reputasi ?? null,
    status_alternatif: row.status_alternatif,
    alasan_dikeluarkan: row.alasan_dikeluarkan ?? null,
    sumber_url: row.sumber_url ?? null,
    tanggal_akses: isoDate(row.tanggal_akses),
    kebutuhan,
    jumlah_wajib: kebutuhan.filter((k) => k.wajib).length,
    jumlah_opsional: kebutuhan.filter((k) => !k.wajib).length,
    terpakai,
    bisa_dihapus: terpakai.hasil === 0 && terpakai.pilihan === 0,
  };
}

export function ubahKeKompetensiAdmin(row) {
  const terpakai = {
    tempat: row._count.kebutuhan_kompetensi,
    mahasiswa: row._count.kompetensi_mahasiswa,
    hasil: row._count.hasil_cga_detail,
  };
  return {
    kode_kompetensi: row.kode_kompetensi,
    nama_kompetensi: row.nama_kompetensi,
    kategori: row.kategori,
    deskripsi: row.deskripsi ?? null,
    skala_maksimum: row.skala_maksimum,
    terpakai,
    bisa_dihapus: terpakai.tempat === 0 && terpakai.mahasiswa === 0 && terpakai.hasil === 0,
  };
}

export function createAdminService({ repository, now = () => new Date() }) {
  // ------------------------------------------------------------------ kriteria
  async function daftarKriteria() {
    const rows = await repository.findKriteria();
    const kriteria = rows.map((r) => ({
      kode_kriteria: r.kode_kriteria,
      nama_kriteria: r.nama_kriteria,
      bobot: Number(r.bobot),
      tipe: r.tipe,
    }));
    const total = Math.round(kriteria.reduce((s, k) => s + Math.round(k.bobot * 10000), 0)) / 10000;
    return { kriteria, total, sementara: true, catatan: CATATAN_BOBOT };
  }

  async function ubahBobot(input) {
    const rows = await repository.findKriteria();
    const { kesalahan, bobot, peringatan } = validasiBobot(input, rows.map((r) => r.kode_kriteria));
    tolakJikaSalah(kesalahan);
    await repository.updateBobot(bobot);
    return { ...(await daftarKriteria()), peringatan };
  }

  // ----------------------------------------------------------------- kompetensi
  const semuaKompetensi = async () => (await repository.findKompetensi()).sort(urutKode);

  async function daftarKompetensi() {
    return (await semuaKompetensi()).map(ubahKeKompetensiAdmin);
  }

  async function buatKompetensi(input) {
    const semua = await semuaKompetensi();
    const { kesalahan, data } = validasiKompetensi(input, { namaLain: semua.map((k) => k.nama_kompetensi), mode: 'baru' });
    const kode = data.kode_kompetensi ?? kodeBerikutnya('K', semua.map((k) => k.kode_kompetensi));
    if (!kesalahan.kode_kompetensi && semua.some((k) => k.kode_kompetensi === kode)) {
      kesalahan.kode_kompetensi = `Kode ${kode} sudah dipakai.`;
    }
    tolakJikaSalah(kesalahan);
    return ubahKeKompetensiAdmin(await repository.createKompetensi({ ...data, kode_kompetensi: kode }));
  }

  async function ubahKompetensi(kode, input) {
    const semua = await semuaKompetensi();
    const ada = semua.find((k) => k.kode_kompetensi === kode);
    if (!ada) throw new HttpError(404, `Kompetensi ${kode} tidak ditemukan`);
    const { kesalahan, data } = validasiKompetensi(input, {
      namaLain: semua.filter((k) => k.kode_kompetensi !== kode).map((k) => k.nama_kompetensi),
      mode: 'ubah',
    });
    if (input?.kode_kompetensi && input.kode_kompetensi !== kode) kesalahan.kode_kompetensi = 'Kode tidak bisa diubah.';
    tolakJikaSalah(kesalahan);
    return ubahKeKompetensiAdmin(await repository.updateKompetensi(ada.kompetensi_id, data));
  }

  async function hapusKompetensi(kode) {
    const ada = await repository.findKompetensiByKode(kode);
    if (!ada) throw new HttpError(404, `Kompetensi ${kode} tidak ditemukan`);
    const { terpakai, bisa_dihapus: bisa } = ubahKeKompetensiAdmin(ada);
    if (!bisa) {
      throw new HttpError(
        409,
        `Kompetensi ${kode} masih dipakai (${terpakai.tempat} kebutuhan tempat, ${terpakai.mahasiswa} jawaban mahasiswa, ${terpakai.hasil} hasil perhitungan), jadi tidak bisa dihapus.`
      );
    }
    await repository.deleteKompetensi(ada.kompetensi_id);
  }

  // --------------------------------------------------------------- tempat magang
  const urutTempat = (a, b) => a.kode_tempat.localeCompare(b.kode_tempat, 'en', { numeric: true });

  async function daftarTempat() {
    return (await repository.findTempatList()).sort(urutTempat).map(ubahKeTempatAdmin);
  }

  async function ambilTempat(kode) {
    const row = await repository.findTempatByKode(kode);
    if (!row) throw new HttpError(404, `Tempat magang ${kode} tidak ditemukan`);
    return ubahKeTempatAdmin(row);
  }

  /** Validated kebutuhan -> rows with the numeric kompetensi id. */
  const petaKompetensi = async () => new Map((await semuaKompetensi()).map((k) => [k.kode_kompetensi, k.kompetensi_id]));

  async function buatTempat(input) {
    const peta = await petaKompetensi();
    const semuaKode = (await repository.findTempatList()).map((t) => t.kode_tempat);
    const { kesalahan, data, kebutuhan } = validasiTempat(input, { kodeKompetensi: new Set(peta.keys()), mode: 'baru', sekarang: now() });
    const kode = data.kode_tempat ?? kodeBerikutnya('T', semuaKode);
    if (!kesalahan.kode_tempat && semuaKode.includes(kode)) kesalahan.kode_tempat = `Kode ${kode} sudah dipakai.`;
    if (kesalahan.kode_tempat?.endsWith('sudah dipakai.')) throw new HttpError(409, kesalahan.kode_tempat, { kesalahan });
    tolakJikaSalah(kesalahan);
    const rows = kebutuhan.map((k) => ({ ...k, kompetensiId: peta.get(k.kompetensi) }));
    return ubahKeTempatAdmin(await repository.createTempat({ ...data, kode_tempat: kode }, rows));
  }

  async function ubahTempat(kode, input) {
    const ada = await repository.findTempatByKode(kode);
    if (!ada) throw new HttpError(404, `Tempat magang ${kode} tidak ditemukan`);
    const peta = await petaKompetensi();
    const { kesalahan, data, kebutuhan } = validasiTempat(input, { kodeKompetensi: new Set(peta.keys()), mode: 'ubah', sekarang: now() });
    if (input?.kode_tempat && input.kode_tempat !== kode) kesalahan.kode_tempat = 'Kode tidak bisa diubah.';
    tolakJikaSalah(kesalahan);
    const rows = kebutuhan.map((k) => ({ ...k, kompetensiId: peta.get(k.kompetensi) }));
    return ubahKeTempatAdmin(await repository.updateTempat(ada.tempat_id, data, rows));
  }

  async function hapusTempat(kode) {
    const row = await repository.findTempatByKode(kode);
    if (!row) throw new HttpError(404, `Tempat magang ${kode} tidak ditemukan`);
    const { terpakai, bisa_dihapus: bisa } = ubahKeTempatAdmin(row);
    if (!bisa) {
      throw new HttpError(
        409,
        `Tempat ${kode} sudah dipakai (${terpakai.hasil} hasil perhitungan, ${terpakai.pilihan} pilihan mahasiswa), jadi tidak bisa dihapus. Ubah statusnya menjadi Dikeluarkan.`
      );
    }
    await repository.deleteTempat(row.tempat_id);
  }

  // ------------------------------------------------------------------ referensi
  /** Lists the forms need: bidang, kategori, kompetensi, suggested codes. */
  async function referensi() {
    const kompetensi = await semuaKompetensi();
    const tempat = await repository.findTempatList();
    return {
      bidang: BIDANG,
      status_alternatif: STATUS_ALTERNATIF,
      mode_kerja_saran: MODE_KERJA_SARAN,
      batas_koordinat: BATAS_INDONESIA,
      kategori: [...new Set(kompetensi.map((k) => k.kategori))].sort((a, b) => a.localeCompare(b, 'id')),
      kompetensi: kompetensi.map((k) => ({ kode_kompetensi: k.kode_kompetensi, nama_kompetensi: k.nama_kompetensi, kategori: k.kategori })),
      saran_kode_tempat: kodeBerikutnya('T', tempat.map((t) => t.kode_tempat)),
      saran_kode_kompetensi: kodeBerikutnya('K', kompetensi.map((k) => k.kode_kompetensi)),
    };
  }

  return {
    daftarKriteria,
    ubahBobot,
    daftarKompetensi,
    buatKompetensi,
    ubahKompetensi,
    hapusKompetensi,
    daftarTempat,
    ambilTempat,
    buatTempat,
    ubahTempat,
    hapusTempat,
    referensi,
  };
}
