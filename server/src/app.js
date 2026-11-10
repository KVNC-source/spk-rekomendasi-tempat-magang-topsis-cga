import cors from 'cors';
import express from 'express';
import { createRekomendasiController } from './controllers/rekomendasi.controller.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createRekomendasiRouter } from './routes/rekomendasi.routes.js';

/** Composition root for the Express app; services are injected so tests need no database. */
export function createApp({ rekomendasiService }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use(
    '/api/rekomendasi',
    createRekomendasiRouter({ rekomendasiController: createRekomendasiController({ rekomendasiService }) })
  );

  app.use(errorHandler);
  return app;
}
