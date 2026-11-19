import { HttpError } from '../lib/httpError.js';

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

function mahasiswaIdDariParam(req) {
  const raw = req.params.mahasiswa_id;
  const id = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!isPositiveInt(id)) throw new HttpError(400, 'mahasiswa_id pada URL harus berupa bilangan bulat positif');
  return id;
}

// mahasiswa_id comes from the request until authentication exists (next step).
export function createPilihanController({ pilihanService }) {
  return {
    async simpan(req, res) {
      const { mahasiswa_id: mahasiswaId, tempat_id: kodeTempat, topsis_id: topsisId } = req.body ?? {};
      if (!isPositiveInt(mahasiswaId)) {
        throw new HttpError(400, 'mahasiswa_id wajib diisi dan berupa bilangan bulat positif');
      }
      if (typeof kodeTempat !== 'string' || kodeTempat.trim() === '') {
        throw new HttpError(400, 'tempat_id wajib diisi dengan kode tempat magang, misalnya "T05"');
      }
      if (topsisId !== undefined && topsisId !== null && !isPositiveInt(topsisId)) {
        throw new HttpError(400, 'topsis_id harus berupa bilangan bulat positif bila diisi');
      }
      const hasil = await pilihanService.simpan({
        mahasiswaId,
        kodeTempat: kodeTempat.trim(),
        topsisId: topsisId ?? null,
      });
      res.json(hasil);
    },

    async ambil(req, res) {
      res.json(await pilihanService.ambil(mahasiswaIdDariParam(req)));
    },

    async hapus(req, res) {
      await pilihanService.hapus(mahasiswaIdDariParam(req));
      res.status(204).end();
    },
  };
}
