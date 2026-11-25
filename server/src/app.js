import { extname, join, sep } from 'node:path';
import cors from 'cors';
import express from 'express';
import { createAdminController } from './controllers/admin.controller.js';
import { createAuthController } from './controllers/auth.controller.js';
import { createPilihanController } from './controllers/pilihan.controller.js';
import { createProfilController } from './controllers/profil.controller.js';
import { createRekomendasiController } from './controllers/rekomendasi.controller.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { securityHeaders, tanpaSimpan } from './middleware/securityHeaders.js';
import { createAdminRouter } from './routes/admin.routes.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createKompetensiRouter } from './routes/kompetensi.routes.js';
import { createPilihanRouter } from './routes/pilihan.routes.js';
import { createProfilRouter } from './routes/profil.routes.js';
import { createReferensiRouter } from './routes/referensi.routes.js';
import { createRekomendasiRouter } from './routes/rekomendasi.routes.js';

/**
 * Composition root for the Express app; services are injected so tests need no database.
 * `authConfig` comes from config/auth.js (CLIENT_ORIGIN, session hours, cookie name).
 * `serverConfig` comes from config/server.js (production, trustProxy, clientDir); without it the app
 * behaves as on a laptop: API only, no extra headers, no proxy.
 */
export function createApp({
  rekomendasiService,
  pilihanService,
  adminService,
  kompetensiService,
  profilService,
  authService,
  authConfig,
  serverConfig = {},
}) {
  const { production = false, trustProxy = false, clientDir = null } = serverConfig;
  const auth = createAuthMiddleware({ authService, config: authConfig });

  const app = express();
  app.disable('x-powered-by');
  if (trustProxy !== false) {
    try {
      app.set('trust proxy', trustProxy);
    } catch {
      throw new Error(`TRUST_PROXY tidak dikenali: "${trustProxy}". Tulis jumlah proxy (misalnya 1), true, atau false.`);
    }
  }
  if (production) app.use(securityHeaders);

  // Only the client may call the API from a browser, and it may send the session cookie.
  app.use(cors({ origin: authConfig.clientOrigin, credentials: true }));
  app.use(express.json());
  if (production) app.use('/api', tanpaSimpan);
  app.use('/api', auth.periksaOrigin);

  // The health check answers without touching the database, so a platform that pings it every few
  // seconds never wakes (or keeps awake) a database that bills by compute time.
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
  app.use('/api', createReferensiRouter({ auth }));
  app.use(
    '/api/mahasiswa/me/profil',
    createProfilRouter({ profilController: createProfilController({ profilService }), auth })
  );
  app.use('/api/admin', createAdminRouter({ adminController: createAdminController({ adminService }), auth }));

  // An address under /api that no route answers is a JSON 404, never the client's index.html.
  app.use('/api', (req, res) => res.status(404).json({ error: 'Alamat API tidak ditemukan' }));

  if (clientDir) {
    // The built client. Files in /assets have a hash in their name, so they may be kept for a year;
    // index.html must always be fetched again, because it names the current hashed files.
    app.use(
      express.static(clientDir, {
        index: false,
        setHeaders(res, berkas) {
          res.setHeader(
            'Cache-Control',
            berkas.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache'
          );
        },
      })
    );
    // Client routes (/masuk, /mahasiswa/...) have no file: they get index.html and the client routes
    // them. A path that looks like a file (has an extension) but does not exist is a plain 404.
    app.get('/{*rute}', (req, res, next) => {
      if (extname(req.path) !== '') return next();
      res.set('Cache-Control', 'no-cache');
      return res.sendFile(join(clientDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
