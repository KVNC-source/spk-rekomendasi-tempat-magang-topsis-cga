import { mahasiswaIdDariSesi } from '../middleware/auth.js';

export function createRekomendasiController({ rekomendasiService }) {
  return {
    async hitung(req, res) {
      // The mahasiswa is the signed-in one; the body is ignored (the client sends {}).
      const hasil = await rekomendasiService.hitungRekomendasi(mahasiswaIdDariSesi(req));
      // 200, as in the client contract (client/src/api/rekomendasi.js).
      res.json(hasil);
    },

    /** The latest result (same shape as POST) with the stale flag; 404 when none exists yet. */
    async terakhir(req, res) {
      res.json(await rekomendasiService.ambilTerakhir(mahasiswaIdDariSesi(req)));
    },
  };
}
