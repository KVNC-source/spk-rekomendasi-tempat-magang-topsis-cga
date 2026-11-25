import { HttpError } from '../lib/httpError.js';
import { catatGalat } from '../lib/catatGalat.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ?? {}) });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Body JSON tidak valid' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Permintaan terlalu besar' });
  }
  // Whatever went wrong stays in the server log (see lib/catatGalat.js); the answer never carries it.
  catatGalat(err, req, 500);
  return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
}
