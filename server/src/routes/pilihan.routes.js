import { Router } from 'express';

export function createPilihanRouter({ pilihanController }) {
  const router = Router();
  // Express 5 forwards rejected promises from async handlers to the error middleware.
  router.put('/', pilihanController.simpan);
  router.get('/:mahasiswa_id', pilihanController.ambil);
  router.delete('/:mahasiswa_id', pilihanController.hapus);
  return router;
}
