import { Router } from 'express';
import { ROLE_MAHASISWA } from '../config/auth.js';

export function createPilihanRouter({ pilihanController, auth }) {
  const router = Router();
  router.use(auth.wajibPeran(ROLE_MAHASISWA));
  // The mahasiswa is the signed-in one: there is no id in the URL or the body.
  router.put('/', pilihanController.simpan);
  router.get('/', pilihanController.ambil);
  router.delete('/', pilihanController.hapus);
  return router;
}
