import { Router } from 'express';

/** GET /api/kompetensi: the list for the profile form. Any signed-in user (mahasiswa or administrator). */
export function createKompetensiRouter({ kompetensiService, auth }) {
  const router = Router();
  router.use(auth.muatSesi, auth.wajibLogin);
  router.get('/', async (req, res) => {
    res.json(await kompetensiService.daftar());
  });
  return router;
}
