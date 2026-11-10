import { HttpError } from '../lib/httpError.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ?? {}) });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Body JSON tidak valid' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
}
