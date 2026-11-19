import cors from 'cors';
import express from 'express';
import { createPilihanController } from './controllers/pilihan.controller.js';
import { createRekomendasiController } from './controllers/rekomendasi.controller.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createPilihanRouter } from './routes/pilihan.routes.js';
import { createRekomendasiRouter } from './routes/rekomendasi.routes.js';

/** Composition root for the Express app; services are injected so tests need no database. */
export function createApp({ rekomendasiService, pilihanService }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use(
    '/api/rekomendasi',
    createRekomendasiRouter({ rekomendasiController: createRekomendasiController({ rekomendasiService }) })
  );

  app.use('/api/pilihan', createPilihanRouter({ pilihanController: createPilihanController({ pilihanService }) }));

  app.use(errorHandler);
  return app;
}
