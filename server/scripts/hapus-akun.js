/**
 * Deletes ONE mahasiswa account for good (administrator use, from the terminal):
 *
 *   npm run hapus-akun -- <email>          shows what would be deleted, deletes nothing
 *   npm run hapus-akun -- <email> --ya     deletes it, in one transaction
 *
 * Removes the account with its profile, kompetensi answers, recommendation results (hasil_cga,
 * detail and topsis too), pilihan and sessions. Administrator accounts and the CONTOH accounts
 * of the seed are refused. This cannot be undone.
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { createAuthRepository } from '../src/repositories/auth.repository.js';
import { createHapusAkunRepository, URUTAN_TABEL } from '../src/repositories/hapusAkun.repository.js';
import { HapusAkunError, bacaArgumen, hapusAkunMahasiswa } from '../src/services/hapusAkun.js';

const tabel = (judul, baris) =>
  [judul, ...URUTAN_TABEL.map((nama) => `    ${nama.padEnd(22)} ${String(baris[nama] ?? 0).padStart(6)}`)].join('\n');

let kodeKeluar = 0;
try {
  const { email, ya } = bacaArgumen(process.argv.slice(2));
  const repository = { ...createAuthRepository(prisma), ...createHapusAkunRepository(prisma) };
  const { akun, rencana, dihapus } = await hapusAkunMahasiswa({ email, ya, repository });

  const nama = `${akun.email} (${akun.nama}, NIM ${akun.nim})`;
  if (dihapus === null) {
    process.stdout.write(
      [
        '',
        tabel(`Yang akan dihapus untuk ${nama}:`, rencana),
        '',
        'Belum ada yang dihapus. Tambahkan --ya untuk menghapus permanen:',
        `    npm run hapus-akun -- ${akun.email} --ya`,
        '',
      ].join('\n')
    );
  } else {
    process.stdout.write(['', tabel(`Sudah dihapus permanen: ${nama}`, dihapus), ''].join('\n'));
  }
} catch (err) {
  console.error(err instanceof HapusAkunError ? err.message : `Gagal menghapus akun: ${err.message}`);
  kodeKeluar = 1;
} finally {
  await prisma.$disconnect();
}
process.exit(kodeKeluar);
