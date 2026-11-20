import { Router } from 'express';
import { BIDANG } from '../engine/src/config.js';
import { DAFTAR_KOTA } from '../lib/kotaDomisili.js';

/**
 * Reference lists for the profile form. Any signed-in user may read them (like
 * GET /api/kompetensi); they hold no personal data. Each route carries its own
 * guard, so this router never answers for paths it does not own.
 *
 *   GET /api/bidang-minat    -> [string]   exactly the engine's BIDANG values
 *   GET /api/kota-domisili   -> [{ kota, provinsi, lat, lon }]   the 27 kota of the master list
 */
export function createReferensiRouter({ auth }) {
  const router = Router();
  const masuk = [auth.muatSesi, auth.wajibLogin];
  router.get('/bidang-minat', masuk, (req, res) => res.json(BIDANG));
  router.get('/kota-domisili', masuk, (req, res) => res.json(DAFTAR_KOTA));
  return router;
}
