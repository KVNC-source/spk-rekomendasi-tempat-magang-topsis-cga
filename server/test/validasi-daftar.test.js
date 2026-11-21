import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEKS_PERSETUJUAN, normalisasiEmail, periksaAngkatan, periksaNama, validasiDaftar } from '../src/services/validasi-daftar.js';

const SEKARANG = new Date('2026-11-21T03:00:00.000Z'); // the current year is 2026
const sah = () => ({
  nama: 'Keefa Noah Lasut',
  nim: '230211060068',
  angkatan: 2023,
  email: 'Keefa@Example.invalid',
  password: 'rahasia-banget',
  konfirmasi: 'rahasia-banget',
  setuju: true,
});
const cek = (ubah) => validasiDaftar({ ...sah(), ...ubah }, { sekarang: SEKARANG });

test('a valid body has no errors, and the email is trimmed and lower-cased', () => {
  const { data, kesalahan } = cek({ email: '  Keefa@Example.invalid ' });
  assert.deepEqual(kesalahan, {});
  assert.deepEqual(data, { nama: 'Keefa Noah Lasut', nim: '230211060068', angkatan: 2023, email: 'keefa@example.invalid', password: 'rahasia-banget' });
  assert.equal(normalisasiEmail('  A@B.CO '), 'a@b.co');
});

test('nama: required, spaces tidied, at most 255 characters', () => {
  for (const salah of [undefined, null, '', '   ', 42, {}]) assert.ok(cek({ nama: salah }).kesalahan.nama, JSON.stringify(salah));
  assert.equal(cek({ nama: '  Keefa   Noah  ' }).data.nama, 'Keefa Noah');
  assert.equal(cek({ nama: 'a'.repeat(255) }).kesalahan.nama, undefined);
  assert.ok(cek({ nama: 'a'.repeat(256) }).kesalahan.nama);
  assert.equal(periksaNama('Nama').pesan, null);
});

test('nim: digits only, 8 to 15 of them, as a string', () => {
  for (const salah of ['1234567', '1'.repeat(16), '2302110600A8', '2302 1106', '23-0211060', '', '   ', undefined, 230211060068]) {
    assert.ok(cek({ nim: salah }).kesalahan.nim, `nim ${JSON.stringify(salah)} must be rejected`);
  }
  for (const benar of ['12345678', '1'.repeat(15), '  230211060068  ', '000000012345']) {
    assert.equal(cek({ nim: benar }).kesalahan.nim, undefined, `nim ${JSON.stringify(benar)}`);
  }
  assert.equal(cek({ nim: ' 230211060068 ' }).data.nim, '230211060068');
  assert.equal(cek({ nim: '000000012345' }).data.nim, '000000012345'); // leading zeros survive
});

test('angkatan: 4 digits, not in the future, not older than 10 years (2016 to 2026 in 2026)', () => {
  for (const salah of [2027, 2015, 1999, 202, 20230, '20x3', '', undefined, null, 2023.5, '2023.5']) {
    assert.ok(cek({ angkatan: salah }).kesalahan.angkatan, `angkatan ${JSON.stringify(salah)} must be rejected`);
  }
  for (const benar of [2026, 2016, 2023, '2023', ' 2024 ']) {
    assert.equal(cek({ angkatan: benar }).kesalahan.angkatan, undefined, `angkatan ${JSON.stringify(benar)}`);
  }
  assert.equal(cek({ angkatan: '2023' }).data.angkatan, 2023);
});

test('angkatan: nothing chosen says "Pilih angkatan."; a wrong value keeps the 4-digit message', () => {
  for (const kosong of ['', '   ', undefined, null]) {
    assert.equal(cek({ angkatan: kosong }).kesalahan.angkatan, 'Pilih angkatan.', JSON.stringify(kosong));
    assert.equal(periksaAngkatan(kosong, SEKARANG).pesan, 'Pilih angkatan.');
  }
  for (const salah of ['20x3', '23', 20230, 2023.5, {}, [], true]) {
    assert.equal(cek({ angkatan: salah }).kesalahan.angkatan, 'Angkatan berupa tahun 4 digit, misalnya 2023.', JSON.stringify(salah));
  }
  // the range messages are unchanged
  assert.match(cek({ angkatan: 2027 }).kesalahan.angkatan, /tidak boleh melebihi 2026/);
  assert.match(cek({ angkatan: 2015 }).kesalahan.angkatan, /paling lama 2016/);
  assert.match(periksaAngkatan(2027, SEKARANG).pesan, /2026/);
  assert.match(periksaAngkatan(2015, SEKARANG).pesan, /2016/);
});

test('email: a valid address, at most 254 characters', () => {
  for (const salah of ['', '   ', 'tanpa-at', 'a@b', '@b.com', 'a@.com', 'a b@c.com', 'a@b.c', undefined, null, 5]) {
    assert.ok(cek({ email: salah }).kesalahan.email, `email ${JSON.stringify(salah)} must be rejected`);
  }
  assert.ok(cek({ email: `${'a'.repeat(250)}@b.com` }).kesalahan.email);
  for (const benar of ['a@b.co', 'nama.belakang+tag@kampus.ac.id', 'x@contoh.invalid']) {
    assert.equal(cek({ email: benar }).kesalahan.email, undefined, benar);
  }
});

test('password: 8 to 128 characters, and not the same as the email or the NIM', () => {
  assert.ok(cek({ password: 'pendek1', konfirmasi: 'pendek1' }).kesalahan.password);
  assert.equal(cek({ password: '12345678', konfirmasi: '12345678' }).kesalahan.password, undefined); // exactly 8
  assert.equal(cek({ password: 'a'.repeat(128), konfirmasi: 'a'.repeat(128) }).kesalahan.password, undefined);
  assert.ok(cek({ password: 'a'.repeat(129), konfirmasi: 'a'.repeat(129) }).kesalahan.password);
  for (const salah of [undefined, null, '', 12345678]) assert.ok(cek({ password: salah, konfirmasi: salah }).kesalahan.password);

  assert.match(cek({ password: 'keefa@example.invalid', konfirmasi: 'keefa@example.invalid' }).kesalahan.password, /email atau NIM/);
  assert.match(cek({ password: 'KEEFA@EXAMPLE.INVALID', konfirmasi: 'KEEFA@EXAMPLE.INVALID' }).kesalahan.password, /email atau NIM/);
  assert.match(cek({ password: '230211060068', konfirmasi: '230211060068' }).kesalahan.password, /email atau NIM/);
});

test('konfirmasi must be the same as the password', () => {
  assert.equal(cek({ konfirmasi: 'rahasia-banget' }).kesalahan.konfirmasi, undefined);
  assert.match(cek({ konfirmasi: 'rahasia-bangeT' }).kesalahan.konfirmasi, /belum sama/);
  assert.ok(cek({ konfirmasi: '' }).kesalahan.konfirmasi);
  assert.ok(cek({ konfirmasi: undefined }).kesalahan.konfirmasi);
});

test('the consent box must be ticked: only the boolean true counts', () => {
  assert.equal(cek({ setuju: true }).kesalahan.setuju, undefined);
  for (const salah of [false, undefined, null, 'true', 'on', 1, 0, {}, []]) {
    assert.ok(cek({ setuju: salah }).kesalahan.setuju, `setuju ${JSON.stringify(salah)} must be rejected`);
  }
  assert.match(TEKS_PERSETUJUAN, /penelitian skripsi/);
  assert.match(TEKS_PERSETUJUAN, /tidak akan dipublikasikan/);
});

test('every problem is reported at once, one message per field', () => {
  const { kesalahan } = validasiDaftar({}, { sekarang: SEKARANG });
  assert.deepEqual(Object.keys(kesalahan).sort(), ['angkatan', 'email', 'nama', 'nim', 'password', 'setuju']);
  for (const pesan of Object.values(kesalahan)) assert.equal(typeof pesan, 'string');
  assert.doesNotThrow(() => validasiDaftar(null));
  assert.doesNotThrow(() => validasiDaftar('x'));
});

test('only the whitelisted fields reach `data`: a role, status or id in the body is dropped', () => {
  const { data } = cek({ role: 'administrator', peran: 'administrator', role_id: 2, status: 'aktif', user_id: 1, mahasiswa_id: 1, is_admin: true });
  assert.deepEqual(Object.keys(data).sort(), ['angkatan', 'email', 'nama', 'nim', 'password']);
});
