import 'dotenv/config';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { createRekomendasiRepository } from './repositories/rekomendasi.repository.js';
import { createRekomendasiService } from './services/rekomendasi.service.js';

const rekomendasiService = createRekomendasiService({
  repository: createRekomendasiRepository(prisma),
});

const port = Number(process.env.PORT) || 3000;
createApp({ rekomendasiService }).listen(port, () => {
  console.log(`API listening on port ${port}`);
});
