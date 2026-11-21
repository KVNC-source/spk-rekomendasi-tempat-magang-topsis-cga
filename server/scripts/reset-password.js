/**
 * Resets the password of ONE mahasiswa account (administrator use, from the terminal):
 *
 *   npm run reset-password -- <email>
 *
 * It prints a random temporary password ONCE, right here in the terminal. The password is
 * never written to a file or a log; only its scrypt hash is stored. Every session of the
 * account is deleted. Administrator accounts are refused.
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { createAkunRepository } from '../src/repositories/akun.repository.js';
import { createAuthRepository } from '../src/repositories/auth.repository.js';
import { ResetPasswordError, resetPasswordMahasiswa } from '../src/services/resetPassword.js';

let kodeKeluar = 0;
try {
  const repository = { ...createAuthRepository(prisma), ...createAkunRepository(prisma) };
  const hasil = await resetPasswordMahasiswa({ email: process.argv[2], repository });
  process.stdout.write(
    [
      '',
      `Password sementara untuk ${hasil.email} (${hasil.nama}):`,
      '',
      `    ${hasil.passwordSementara}`,
      '',
      'Berikan ke pemiliknya lewat jalur yang aman. Password ini hanya tampil sekali dan tidak disimpan di mana pun;',
      `yang tersimpan hanya hash-nya. ${hasil.sesiDihapus} sesi masuk akun ini sudah dihapus.`,
      '',
    ].join('\n')
  );
} catch (err) {
  // Only the message: never the password, and no stack trace for a problem the administrator can fix.
  console.error(err instanceof ResetPasswordError ? err.message : `Gagal mereset password: ${err.message}`);
  kodeKeluar = 1;
} finally {
  await prisma.$disconnect();
}
process.exit(kodeKeluar);
