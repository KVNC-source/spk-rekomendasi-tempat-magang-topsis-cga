import { HttpError } from '../lib/httpError.js';

export function createRekomendasiController({ rekomendasiService }) {
  return {
    async hitung(req, res) {
      const mahasiswaId = req.body?.mahasiswa_id;
      if (!Number.isInteger(mahasiswaId) || mahasiswaId <= 0) {
        throw new HttpError(400, 'mahasiswa_id wajib diisi dan berupa bilangan bulat positif');
      }
      const hasil = await rekomendasiService.hitungRekomendasi(mahasiswaId);
      res.status(201).json(hasil);
    },
  };
}
