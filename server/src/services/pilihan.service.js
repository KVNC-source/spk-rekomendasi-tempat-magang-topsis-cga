/**
 * Business Logic Layer — pilihan. A mahasiswa keeps ONE chosen tempat magang;
 * choosing again replaces it. The koordinator magang is not a system user:
 * approval happens outside the system (Batasan 6), so there is no status here.
 *
 * Tempat magang are identified by their public code ("T05"), never by the
 * numeric primary key.
 */
import { HttpError } from '../lib/httpError.js';

const isoDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);

/** Row → response shape (client/src/api/rekomendasi.js, "Pilihan"). */
export function ubahKeResponsPilihan(row) {
  return {
    tempat_id: row.tempat_magang.kode_tempat,
    namaPerusahaan: row.tempat_magang.nama_perusahaan,
    posisi: row.tempat_magang.posisi,
    sumberUrl: row.tempat_magang.sumber_url ?? null,
    tanggalAkses: isoDate(row.tempat_magang.tanggal_akses),
    topsis_id: row.topsis_id ?? null,
    disimpan_pada: new Date(row.dipilih_pada).toISOString(),
  };
}

export function createPilihanService({ repository }) {
  async function pastikanMahasiswa(mahasiswaId) {
    const mahasiswa = await repository.findMahasiswa(mahasiswaId);
    if (!mahasiswa) throw new HttpError(404, `Mahasiswa ${mahasiswaId} tidak ditemukan`);
  }

  return {
    /** Save the choice, or replace the earlier one. `topsisId` is optional. */
    async simpan({ mahasiswaId, kodeTempat, topsisId = null }) {
      await pastikanMahasiswa(mahasiswaId);

      const tempat = await repository.findTempatByKode(kodeTempat);
      if (!tempat) throw new HttpError(404, `Tempat magang ${kodeTempat} tidak ditemukan`);
      if (tempat.status_alternatif !== 'Dipakai') {
        throw new HttpError(422, `Tempat magang ${kodeTempat} tidak termasuk daftar yang dihitung, jadi tidak bisa dipilih`);
      }

      if (topsisId !== null) {
        const hasil = await repository.findHasilTopsis(topsisId);
        if (!hasil || hasil.hasil_cga.mahasiswa_id !== mahasiswaId || hasil.hasil_cga.tempat_id !== tempat.tempat_id) {
          throw new HttpError(422, `topsis_id ${topsisId} bukan hasil perhitungan mahasiswa ini untuk ${kodeTempat}`);
        }
      }

      const row = await repository.simpanPilihan({ mahasiswaId, tempatId: tempat.tempat_id, topsisId });
      return ubahKeResponsPilihan(row);
    },

    /** The current choice, or null when the mahasiswa has not chosen. */
    async ambil(mahasiswaId) {
      await pastikanMahasiswa(mahasiswaId);
      const row = await repository.findPilihan(mahasiswaId);
      return row ? ubahKeResponsPilihan(row) : null;
    },

    /** Remove the choice. Removing when there is none is not an error. */
    async hapus(mahasiswaId) {
      await pastikanMahasiswa(mahasiswaId);
      await repository.hapusPilihan(mahasiswaId);
    },
  };
}
