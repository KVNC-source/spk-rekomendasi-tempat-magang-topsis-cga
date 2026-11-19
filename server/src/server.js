import 'dotenv/config';
import { createApp } from './app.js';
import { getAuthConfig } from './config/auth.js';
import { createLoginLimiter } from './lib/loginLimiter.js';
import { prisma } from './lib/prisma.js';
import { createAdminRepository } from './repositories/admin.repository.js';
import { createAuthRepository } from './repositories/auth.repository.js';
import { createPilihanRepository } from './repositories/pilihan.repository.js';
import { createRekomendasiRepository } from './repositories/rekomendasi.repository.js';
import { createAdminService } from './services/admin.service.js';
import { createAuthService } from './services/auth.service.js';
import { createKompetensiService } from './services/kompetensi.service.js';
import { createPilihanService } from './services/pilihan.service.js';
import { createRekomendasiService } from './services/rekomendasi.service.js';

const authConfig = getAuthConfig();

const authService = createAuthService({
  repository: createAuthRepository(prisma),
  limiter: createLoginLimiter({ maxAttempts: authConfig.maxAttempts, windowMs: authConfig.lockMinutes * 60 * 1000 }),
  config: authConfig,
});
const rekomendasiService = createRekomendasiService({ repository: createRekomendasiRepository(prisma) });
const pilihanService = createPilihanService({ repository: createPilihanRepository(prisma) });
const adminRepository = createAdminRepository(prisma);
const adminService = createAdminService({ repository: adminRepository });
const kompetensiService = createKompetensiService({ repository: adminRepository });

const port = Number(process.env.PORT) || 3000;
createApp({ rekomendasiService, pilihanService, adminService, kompetensiService, authService, authConfig }).listen(port, () => {
  console.log(`API listening on port ${port}`);
});
