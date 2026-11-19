import cors from 'cors';
import express from 'express';
import { createAdminController } from './controllers/admin.controller.js';
import { createAuthController } from './controllers/auth.controller.js';
import { createPilihanController } from './controllers/pilihan.controller.js';
import { createRekomendasiController } from './controllers/rekomendasi.controller.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAdminRouter } from './routes/admin.routes.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createKompetensiRouter } from './routes/kompetensi.routes.js';
import { createPilihanRouter } from './routes/pilihan.routes.js';
import { createRekomendasiRouter } from './routes/rekomendasi.routes.js';

/**
 * Composition root for the Express app; services are injected so tests need no database.
 * `authConfig` comes from config/auth.js (CLIENT_ORIGIN, session hours, cookie name).
 */
export function createApp({ rekomendasiService, pilihanService, adminService, kompetensiService, authService, authConfig }) {
  const auth = createAuthMiddleware({ authService, config: authConfig });

  const app = express();
  // Only the client may call the API from a browser, and it may send the session cookie.
  app.use(cors({ origin: authConfig.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use('/api', auth.periksaOrigin);

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use(
    '/api/auth',
    createAuthRouter({ authController: createAuthController({ authService, config: authConfig }), auth })
  );
  app.use(
    '/api/rekomendasi',
    createRekomendasiRouter({ rekomendasiController: createRekomendasiController({ rekomendasiService }), auth })
  );
  app.use(
    '/api/pilihan',
    createPilihanRouter({ pilihanController: createPilihanController({ pilihanService }), auth })
  );
  app.use('/api/kompetensi', createKompetensiRouter({ kompetensiService, auth }));
  app.use('/api/admin', createAdminRouter({ adminController: createAdminController({ adminService }), auth }));

  app.use(errorHandler);
  return app;
}
