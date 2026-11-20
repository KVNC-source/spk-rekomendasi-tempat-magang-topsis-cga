import { Router } from 'express';
import { ROLE_MAHASISWA } from '../config/auth.js';

/** GET / PUT /api/mahasiswa/me/profil: the signed-in mahasiswa's own profile. Mahasiswa role only. */
export function createProfilRouter({ profilController, auth }) {
  const router = Router();
  router.use(auth.wajibPeran(ROLE_MAHASISWA));
  router.get('/', profilController.baca);
  router.put('/', profilController.simpan);
  return router;
}
