import 'dotenv/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from './app.js';
import { getAuthConfig } from './config/auth.js';
import { getServerConfig } from './config/server.js';
import { teksTarget } from './lib/dbTarget.js';
import { createLoginLimiter } from './lib/loginLimiter.js';
import { prisma } from './lib/prisma.js';
import { createAdminRepository } from './repositories/admin.repository.js';
import { createAuthRepository } from './repositories/auth.repository.js';
import { createPilihanRepository } from './repositories/pilihan.repository.js';
import { createProfilRepository } from './repositories/profil.repository.js';
import { createRekomendasiRepository } from './repositories/rekomendasi.repository.js';
import { createAdminService } from './services/admin.service.js';
import { createAuthService } from './services/auth.service.js';
import { createKompetensiService } from './services/kompetensi.service.js';
import { createPilihanService } from './services/pilihan.service.js';
import { createProfilService } from './services/profil.service.js';
import { createRekomendasiService } from './services/rekomendasi.service.js';

const authConfig = getAuthConfig();
const serverConfig = getServerConfig();

// In production this one process also serves the website, so it must find the built client.
if (serverConfig.clientDir && !existsSync(join(serverConfig.clientDir, 'index.html'))) {
  throw new Error(
    `Hasil build klien tidak ditemukan di ${serverConfig.clientDir}. Jalankan "npm run build" di folder client dulu (atau isi CLIENT_DIST).`
  );
}

const authService = createAuthService({
  repository: createAuthRepository(prisma),
  limiter: createLoginLimiter({ maxAttempts: authConfig.maxAttempts, windowMs: authConfig.lockMinutes * 60 * 1000 }),
  // One counted attempt per successful registration, per IP, per hour (DAFTAR_MAKS_PER_JAM).
  pendaftaranLimiter: createLoginLimiter({ maxAttempts: authConfig.daftarMaksPerJam, windowMs: 60 * 60 * 1000 }),
  config: authConfig,
});
const rekomendasiService = createRekomendasiService({ repository: createRekomendasiRepository(prisma) });
const pilihanService = createPilihanService({ repository: createPilihanRepository(prisma) });
const adminRepository = createAdminRepository(prisma);
const adminService = createAdminService({ repository: adminRepository });
const kompetensiService = createKompetensiService({ repository: adminRepository });
const profilService = createProfilService({ repository: createProfilRepository(prisma) });

const port = Number(process.env.PORT) || 3000;
createApp({
  rekomendasiService,
  pilihanService,
  adminService,
  kompetensiService,
  profilService,
  authService,
  authConfig,
  serverConfig,
}).listen(port, () => {
  console.log(`API listening on port ${port}`);
  if (serverConfig.production) {
    // What an operator needs to check a deployment, never a secret (the database line has no user or password).
    console.log(
      `Mode produksi: situs dan API satu alamat (${authConfig.clientOrigin}); trust proxy: ${JSON.stringify(serverConfig.trustProxy)}; ` +
        `batas pendaftaran: ${authConfig.daftarMaksPerJam} per IP per jam; database: ${teksTarget()}`
    );
  }
});
