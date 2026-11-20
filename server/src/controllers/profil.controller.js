import { mahasiswaIdDariSesi } from '../middleware/auth.js';

// The mahasiswa is always the signed-in one (mahasiswaIdDariSesi): there is no id in the URL or the body.
export function createProfilController({ profilService }) {
  return {
    async baca(req, res) {
      res.json(await profilService.baca(mahasiswaIdDariSesi(req)));
    },
    async simpan(req, res) {
      res.json(await profilService.simpan(mahasiswaIdDariSesi(req), req.body));
    },
  };
}
