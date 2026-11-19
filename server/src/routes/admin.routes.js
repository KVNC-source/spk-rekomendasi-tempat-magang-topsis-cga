import { Router } from 'express';
import { ROLE_ADMINISTRATOR } from '../config/auth.js';

export function createAdminRouter({ adminController, auth }) {
  const router = Router();
  router.use(auth.wajibPeran(ROLE_ADMINISTRATOR));
  router.get('/kriteria', adminController.kriteria);
  return router;
}
