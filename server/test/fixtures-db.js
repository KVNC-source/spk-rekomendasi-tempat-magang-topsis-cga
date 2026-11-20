import { readFileSync } from 'node:fs';
import { criteriaC1C7 } from '../src/engine/src/topsis.js';

/** Database rows built from the engine's dataset.json, in the shape Prisma returns them. */
const readJson = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
export const dataset = readJson('../src/engine/data/dataset.json');
export const profilContoh = readJson('../src/engine/data/profil_contoh.json').profil.find((p) => p.id === 'CONTOH-WEB-MANADO');

export const NOW = new Date('2026-11-17T08:00:00.000Z');
export const DIPERBARUI = new Date('2026-11-16T09:30:00.000Z');

// --- Database rows built from dataset.json, in the shape Prisma returns them.

export const kompetensiRows = dataset.kompetensi.map((k, i) => ({
  kompetensi_id: i + 1,
  kode_kompetensi: k.id,
  nama_kompetensi: k.nama,
  skala_maksimum: 4,
}));

const decimal = (value) => (value === null || value === undefined ? null : String(value));

export const tempatRows = dataset.tempat.map((t, i) => ({
  tempat_id: i + 1,
  kode_tempat: t.tempatId,
  nama_perusahaan: t.namaPerusahaan,
  posisi: t.posisi,
  bidang_industri: t.bidang,
  lokasi: t.lokasi,
  mode_kerja: t.modeKerja,
  latitude: decimal(t.lat),
  longitude: decimal(t.lon),
  benefit_finansial: decimal(t.benefitFinansial),
  reputasi: t.reputasi,
  status_alternatif: t.statusAlternatif,
  alasan_dikeluarkan: t.alasanDikeluarkan,
  sumber_url: t.sumberUrl,
  tanggal_akses: t.tanggalAkses ? new Date(`${t.tanggalAkses}T00:00:00Z`) : null,
  kebutuhan_kompetensi: dataset.kebutuhan
    .filter((k) => k.tempatId === t.tempatId)
    .map((k) => ({
      kebutuhan_id: Number(k.kebutuhanId.replace('KB', '')),
      level_minimum: k.levelMinimum,
      is_mandatory: k.jenis === 'wajib',
      kompetensi: { kode_kompetensi: k.kompetensiId },
    })),
}));

export const kriteriaRows = () =>
  criteriaC1C7().map((c, i) => ({
    kriteria_id: i + 1,
    kode_kriteria: c.code,
    nama_kriteria: c.label,
    bobot: String(c.weight),
    tipe: c.type,
  }));

/** The sample profile with all 21 answers (missing ones are an explicit level 0). */
export const mahasiswa = {
  mahasiswa_id: 1,
  nim: 'CONTOH-0001',
  nama: 'CONTOH Mahasiswa Web Manado',
  ipk: String(profilContoh.ipk),
  minat_bidang: profilContoh.minatBidang,
  domisili_latitude: String(profilContoh.domisili.lat),
  domisili_longitude: String(profilContoh.domisili.lon),
  kota_domisili: 'Manado',
  jumlah_proyek: 2, // C7 = 2 + 2 = 4, the skorPengalamanSertifikasi of profil_contoh.json
  jumlah_sertifikasi: 2,
  diperbarui_pada: DIPERBARUI,
  kompetensi_mahasiswa: kompetensiRows.map((k) => ({
    kompetensi_id: k.kompetensi_id,
    level_penguasaan: profilContoh.kompetensi[k.kode_kompetensi] ?? 0,
    kompetensi: { kode_kompetensi: k.kode_kompetensi },
  })),
};

