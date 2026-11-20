/**
 * Business Logic Layer: the mahasiswa's own profile (IPK, minat, kota, the two
 * counts behind C7, and the level of every kompetensi).
 *
 * "status" is computed every time the profile is read, never stored:
 *   Lengkap  every data field is filled AND every kompetensi in the kompetensi
 *            table has an answer (level 0 "Belum punya" counts as an answer)
 *   Draf     anything else
 * So when the Administrator adds a kompetensi, a Lengkap profile becomes Draf
 * until the new one is answered.
 */
import { HttpError } from '../lib/httpError.js';
import { validasiProfil } from './validasi-profil.js';

const num = (value) => (value === null || value === undefined ? null : Number(value));

/** The mahasiswa's saved data fields that are still empty, by API field name. */
export function dataProfilKurang(m) {
  return [
    m.ipk == null && 'ipk',
    !m.minat_bidang && 'minat_bidang',
    (!m.kota_domisili || m.domisili_latitude == null || m.domisili_longitude == null) && 'domisili',
    m.jumlah_proyek == null && 'jumlah_proyek',
    m.jumlah_sertifikasi == null && 'jumlah_sertifikasi',
  ].filter(Boolean);
}

/** "Lengkap" or "Draf" for a mahasiswa row (with kompetensi_mahasiswa) against the kompetensi table. */
export function hitungStatus(m, kompetensiRows) {
  const dijawab = new Set(m.kompetensi_mahasiswa.map((km) => km.kompetensi.kode_kompetensi));
  const semuaDijawab = kompetensiRows.every((k) => dijawab.has(k.kode_kompetensi));
  return semuaDijawab && dataProfilKurang(m).length === 0 ? 'Lengkap' : 'Draf';
}

/** The response of GET and PUT, in the shape of the client contract (client/src/api/profil.js). */
export function bentukProfil(m, kompetensiRows) {
  return {
    mahasiswa: { mahasiswa_id: m.mahasiswa_id, nim: m.nim, nama: m.nama, angkatan: m.angkatan },
    status: hitungStatus(m, kompetensiRows),
    ipk: num(m.ipk),
    minat_bidang: m.minat_bidang ?? null,
    domisili: m.kota_domisili ? { kota: m.kota_domisili, lat: num(m.domisili_latitude), lon: num(m.domisili_longitude) } : null,
    jumlah_proyek: m.jumlah_proyek ?? null,
    jumlah_sertifikasi: m.jumlah_sertifikasi ?? null,
    kompetensi: [...m.kompetensi_mahasiswa]
      .map((km) => ({ kompetensi_id: km.kompetensi.kode_kompetensi, level_penguasaan: km.level_penguasaan }))
      .sort((a, b) => (a.kompetensi_id < b.kompetensi_id ? -1 : 1)),
    diperbarui_pada: new Date(m.diperbarui_pada).toISOString(),
  };
}

export function createProfilService({ repository }) {
  async function baca(mahasiswaId) {
    const [mahasiswa, kompetensiRows] = await Promise.all([repository.findMahasiswa(mahasiswaId), repository.findKompetensi()]);
    if (!mahasiswa) throw new HttpError(404, `Mahasiswa ${mahasiswaId} tidak ditemukan`);
    return bentukProfil(mahasiswa, kompetensiRows);
  }

  /** Replaces the whole profile of the signed-in mahasiswa (a partial draft is fine). */
  async function simpan(mahasiswaId, body) {
    const kompetensiRows = await repository.findKompetensi();
    const skala = new Map(kompetensiRows.map((k) => [k.kode_kompetensi, k.skala_maksimum]));
    const { data, kesalahan } = validasiProfil(body, skala);
    if (Object.keys(kesalahan).length > 0) {
      throw new HttpError(422, 'Profil belum bisa disimpan. Periksa isian yang bertanda salah.', { kesalahan });
    }
    const kompetensiIdByKode = new Map(kompetensiRows.map((k) => [k.kode_kompetensi, k.kompetensi_id]));
    const tersimpan = await repository.simpanProfil(mahasiswaId, {
      ipk: data.ipk,
      minat_bidang: data.minat_bidang,
      kota_domisili: data.domisili?.kota ?? null,
      domisili_latitude: data.domisili?.lat ?? null,
      domisili_longitude: data.domisili?.lon ?? null,
      jumlah_proyek: data.jumlah_proyek,
      jumlah_sertifikasi: data.jumlah_sertifikasi,
      kompetensi: data.kompetensi.map((j) => ({ kompetensi_id: kompetensiIdByKode.get(j.kode), level_penguasaan: j.level })),
    });
    if (!tersimpan) throw new HttpError(404, `Mahasiswa ${mahasiswaId} tidak ditemukan`);
    return bentukProfil(tersimpan, kompetensiRows);
  }

  return { baca, simpan };
}
