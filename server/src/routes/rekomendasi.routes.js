import { Router } from 'express';

export function createRekomendasiRouter({ rekomendasiController }) {
  const router = Router();
  // Express 5 forwards rejected promises from async handlers to the error middleware.
  router.post('/', rekomendasiController.hitung);
  return router;
}
