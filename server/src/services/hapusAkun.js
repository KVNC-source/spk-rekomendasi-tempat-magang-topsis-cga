/**
 * Administrator-only, PERMANENT deletion of a MAHASISWA account (run from the terminal with
 * `npm run hapus-akun -- <email> --ya`; there is no page for it).
 *
 * Without `--ya` it only reports what would be deleted (rows per table) and deletes nothing.
 * With `--ya` it deletes the account and everything it owns in one transaction: the profile,
 * the kompetensi answers, the recommendation results (hasil_rekomendasi and the hasil_cga,
 * hasil_cga_detail and hasil_topsis rows), the pilihan and the sessions.
 *
 * Refused: an unknown email, an administrator account, and the two CONTOH accounts of the seed.
 */
import { AWALAN_NIM_CONTOH, EMAIL_AKUN_CONTOH } from '../config/akunContoh.js';
import { ROLE_MAHASISWA } from '../config/auth.js';
import { normalisasiEmail } from './validasi-daftar.js';

/** A problem the administrator can fix: shown as a plain message, no stack trace. */
export class HapusAkunError extends Error {}

export const PETUNJUK = 'Pemakaian: npm run hapus-akun -- <email> [--ya]';

/**
 * Splits the command line into the email and the --ya flag. Anything else is refused, so a
 * typo such as "--yes" can never be read as consent.
 * @param {string[]} argv  process.argv.slice(2)
 */
export function bacaArgumen(argv) {
  const ya = argv.includes('--ya');
  const lain = argv.filter((a) => a !== '--ya');
  const bendera = lain.filter((a) => a.startsWith('-'));
  if (bendera.length > 0) throw new HapusAkunError(`Opsi tidak dikenal: ${bendera.join(' ')}. ${PETUNJUK}`);
  const email = lain.filter((a) => !a.startsWith('-'));
  if (email.length === 0) throw new HapusAkunError(`Tulis email akunnya. ${PETUNJUK}`);
  if (email.length > 1) throw new HapusAkunError(`Satu akun saja per perintah. ${PETUNJUK}`);
  return { email: email[0], ya };
}

/**
 * @param {{ email: string, ya?: boolean, repository: object }} args
 *   repository: findUserByEmail (auth repository) + hitungMilikAkun + hapusAkun (hapusAkun repository)
 * @returns {Promise<{ akun: { email: string, nama: string, nim: string|null }, rencana: object, dihapus: object|null }>}
 *   `dihapus` is null unless `ya` was true and the deletion ran.
 */
export async function hapusAkunMahasiswa({ email, ya = false, repository }) {
  const emailBersih = normalisasiEmail(email);
  if (emailBersih === '') throw new HapusAkunError(`Tulis email akunnya. ${PETUNJUK}`);

  const user = await repository.findUserByEmail(emailBersih);
  if (!user) throw new HapusAkunError(`Tidak ada akun dengan email ${emailBersih}.`);

  if (user.role?.nama_role !== ROLE_MAHASISWA) {
    throw new HapusAkunError('Skrip ini hanya untuk akun mahasiswa. Akun administrator tidak bisa dihapus dengan skrip ini.');
  }
  const nim = user.mahasiswa?.nim ?? null;
  if (EMAIL_AKUN_CONTOH.includes(emailBersih) || (nim !== null && nim.startsWith(AWALAN_NIM_CONTOH))) {
    throw new HapusAkunError('Akun CONTOH dari seed tidak boleh dihapus.');
  }
  if (!user.mahasiswa) throw new HapusAkunError('Akun ini tidak punya data mahasiswa, jadi tidak dihapus oleh skrip ini.');

  const kunci = { userId: user.user_id, mahasiswaId: user.mahasiswa.mahasiswa_id };
  const akun = { email: user.email, nama: user.mahasiswa.nama, nim };
  const rencana = await repository.hitungMilikAkun(kunci);
  if (ya !== true) return { akun, rencana, dihapus: null };

  const dihapus = await repository.hapusAkun(kunci);
  return { akun, rencana, dihapus };
}
