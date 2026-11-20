import { Router } from 'express';
import { ROLE_MAHASISWA } from '../config/auth.js';

export function createRekomendasiRouter({ rekomendasiController, auth }) {
  const router = Router();
  router.use(auth.wajibPeran(ROLE_MAHASISWA));
  // Express 5 forwards rejected promises from async handlers to the error middleware.
  router.post('/', rekomendasiController.hitung);
  router.get('/terakhir', rekomendasiController.terakhir);
  return router;
}
