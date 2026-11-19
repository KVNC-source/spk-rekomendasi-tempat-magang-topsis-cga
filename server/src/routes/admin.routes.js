import { Router } from 'express';
import { ROLE_ADMINISTRATOR } from '../config/auth.js';

/** Everything under /api/admin is for the administrator only (401 without a session, 403 for a mahasiswa). */
export function createAdminRouter({ adminController: c, auth }) {
  const router = Router();
  router.use(auth.wajibPeran(ROLE_ADMINISTRATOR));
  // Express 5 forwards rejected promises from async handlers to the error middleware.

  router.get('/referensi', c.referensi);

  router.get('/kriteria', c.kriteria);
  router.put('/kriteria', c.ubahKriteria);

  router.get('/kompetensi', c.daftarKompetensi);
  router.post('/kompetensi', c.buatKompetensi);
  router.put('/kompetensi/:kode', c.ubahKompetensi);
  router.delete('/kompetensi/:kode', c.hapusKompetensi);

  router.get('/tempat', c.daftarTempat);
  router.post('/tempat', c.buatTempat);
  router.get('/tempat/:kode', c.ambilTempat);
  router.put('/tempat/:kode', c.ubahTempat);
  router.delete('/tempat/:kode', c.hapusTempat);

  return router;
}
