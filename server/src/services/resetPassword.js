/**
 * Administrator-only password reset for a MAHASISWA account (run from the terminal
 * with `npm run reset-password -- <email>`; there is no page for it).
 *
 * It makes a random temporary password, stores only its scrypt hash, and deletes every
 * session of the account, so whoever was signed in is signed out. The plain password is
 * RETURNED to the caller (the script prints it once) and is never logged or written
 * anywhere by this module. An administrator account is refused.
 */
import { randomInt } from 'node:crypto';
import { ROLE_MAHASISWA } from '../config/auth.js';
import { hashPassword } from '../lib/password.js';
import { normalisasiEmail } from './validasi-daftar.js';

export const PANJANG_PASSWORD_SEMENTARA = 16;
export const PANJANG_MINIMAL = 12;

// no look-alike characters (0 O o, 1 l I) so it can be read out or typed without mistakes
const HURUF_BESAR = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const HURUF_KECIL = 'abcdefghijkmnpqrstuvwxyz';
const ANGKA = '23456789';
const SEMUA = HURUF_BESAR + HURUF_KECIL + ANGKA;

const pilih = (abjad) => abjad[randomInt(abjad.length)];

/** A random password of at least 12 characters (16 by default) with an upper-case letter, a lower-case letter and a digit. */
export function buatPasswordSementara(panjang = PANJANG_PASSWORD_SEMENTARA) {
  const n = Math.max(panjang, PANJANG_MINIMAL);
  const huruf = [pilih(HURUF_BESAR), pilih(HURUF_KECIL), pilih(ANGKA)];
  while (huruf.length < n) huruf.push(pilih(SEMUA));
  // Fisher-Yates with a secure random, so the three guaranteed characters are not always first
  for (let i = huruf.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [huruf[i], huruf[j]] = [huruf[j], huruf[i]];
  }
  return huruf.join('');
}

/** A problem the administrator can fix: shown as a plain message, no stack trace. */
export class ResetPasswordError extends Error {}

/**
 * @param {{ email: string, repository: object }} args
 * @returns {Promise<{ email: string, nama: string, passwordSementara: string, sesiDihapus: number }>}
 */
export async function resetPasswordMahasiswa({ email, repository }) {
  const emailBersih = normalisasiEmail(email);
  if (emailBersih === '') throw new ResetPasswordError('Tulis email akunnya: npm run reset-password -- <email>');

  const user = await repository.findUserByEmail(emailBersih);
  if (!user) throw new ResetPasswordError(`Tidak ada akun dengan email ${emailBersih}.`);
  if (user.role?.nama_role !== ROLE_MAHASISWA) {
    throw new ResetPasswordError('Skrip ini hanya untuk akun mahasiswa. Akun administrator tidak bisa direset dengan skrip ini.');
  }

  const passwordSementara = buatPasswordSementara();
  const { sesiDihapus } = await repository.ubahPasswordDanHapusSesi(user.user_id, await hashPassword(passwordSementara));
  return { email: user.email, nama: user.mahasiswa?.nama ?? user.username, passwordSementara, sesiDihapus };
}
