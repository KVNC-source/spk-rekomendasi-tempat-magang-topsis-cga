import 'dotenv/config';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { createPilihanRepository } from './repositories/pilihan.repository.js';
import { createRekomendasiRepository } from './repositories/rekomendasi.repository.js';
import { createPilihanService } from './services/pilihan.service.js';
import { createRekomendasiService } from './services/rekomendasi.service.js';

const rekomendasiService = createRekomendasiService({
  repository: createRekomendasiRepository(prisma),
});

const pilihanService = createPilihanService({ repository: createPilihanRepository(prisma) });

const port = Number(process.env.PORT) || 3000;
createApp({ rekomendasiService, pilihanService }).listen(port, () => {
  console.log(`API listening on port ${port}`);
});
