import { HttpError } from '../lib/httpError.js';
import { mahasiswaIdDariSesi } from '../middleware/auth.js';

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

// The mahasiswa always comes from the login session (mahasiswaIdDariSesi).
export function createPilihanController({ pilihanService }) {
  return {
    async simpan(req, res) {
      const { tempat_id: kodeTempat, topsis_id: topsisId } = req.body ?? {};
      if (typeof kodeTempat !== 'string' || kodeTempat.trim() === '') {
        throw new HttpError(400, 'tempat_id wajib diisi dengan kode tempat magang, misalnya "T05"');
      }
      if (topsisId !== undefined && topsisId !== null && !isPositiveInt(topsisId)) {
        throw new HttpError(400, 'topsis_id harus berupa bilangan bulat positif bila diisi');
      }
      const hasil = await pilihanService.simpan({
        mahasiswaId: mahasiswaIdDariSesi(req),
        kodeTempat: kodeTempat.trim(),
        topsisId: topsisId ?? null,
      });
      res.json(hasil);
    },

    async ambil(req, res) {
      res.json(await pilihanService.ambil(mahasiswaIdDariSesi(req)));
    },

    async hapus(req, res) {
      await pilihanService.hapus(mahasiswaIdDariSesi(req));
      res.status(204).end();
    },
  };
}
