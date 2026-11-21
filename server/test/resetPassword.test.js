import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyPassword } from '../src/lib/password.js';
import {
  PANJANG_MINIMAL,
  ResetPasswordError,
  buatPasswordSementara,
  resetPasswordMahasiswa,
} from '../src/services/resetPassword.js';

function fakeRepository(users) {
  const state = { users, ubah: [], sesi: { 11: 3, 12: 0 } };
  return {
    state,
    findUserByEmail: async (email) => state.users.find((u) => u.email === email) ?? null,
    ubahPasswordDanHapusSesi: async (userId, passwordHash) => {
      state.ubah.push({ userId, passwordHash });
      const sesiDihapus = state.sesi[userId] ?? 0;
      state.sesi[userId] = 0;
      return { sesiDihapus };
    },
  };
}
const mahasiswa = { user_id: 11, email: 'resp@example.invalid', username: 'Responden', password: 'lama', role: { nama_role: 'mahasiswa' }, mahasiswa: { nama: 'Responden Uji' } };
const admin = { user_id: 1, email: 'admin@example.invalid', username: 'adm', password: 'lama', role: { nama_role: 'administrator' }, mahasiswa: null };

test('the temporary password is random, at least 12 characters, and mixes upper case, lower case and digits', () => {
  const dilihat = new Set();
  for (let i = 0; i < 200; i += 1) {
    const p = buatPasswordSementara();
    assert.ok(p.length >= PANJANG_MINIMAL, p);
    assert.match(p, /[A-Z]/);
    assert.match(p, /[a-z]/);
    assert.match(p, /[0-9]/);
    assert.doesNotMatch(p, /[0OlI1]/); // no look-alike characters
    dilihat.add(p);
  }
  assert.equal(dilihat.size, 200); // never the same twice
  assert.equal(PANJANG_MINIMAL, 12);
});

test('a requested length below 12 is raised to 12', () => {
  assert.equal(buatPasswordSementara(4).length, 12);
  assert.equal(buatPasswordSementara(20).length, 20);
});

test('reset: stores only a scrypt hash that matches the returned password, and deletes every session of the account', async () => {
  const repository = fakeRepository([mahasiswa, admin]);
  const hasil = await resetPasswordMahasiswa({ email: '  RESP@Example.invalid ', repository });

  assert.equal(hasil.email, 'resp@example.invalid');
  assert.equal(hasil.nama, 'Responden Uji');
  assert.ok(hasil.passwordSementara.length >= 12);
  assert.equal(hasil.sesiDihapus, 3);

  assert.equal(repository.state.ubah.length, 1);
  const { userId, passwordHash } = repository.state.ubah[0];
  assert.equal(userId, 11);
  assert.match(passwordHash, /^scrypt\$/);
  assert.ok(!passwordHash.includes(hasil.passwordSementara)); // the hash does not contain the password
  assert.equal(await verifyPassword(hasil.passwordSementara, passwordHash), true);
  assert.equal(await verifyPassword('bukan-itu', passwordHash), false);
  assert.equal(repository.state.sesi[11], 0);
});

test('every reset makes a different password', async () => {
  const repository = fakeRepository([mahasiswa]);
  const a = await resetPasswordMahasiswa({ email: mahasiswa.email, repository });
  const b = await resetPasswordMahasiswa({ email: mahasiswa.email, repository });
  assert.notEqual(a.passwordSementara, b.passwordSementara);
  assert.notEqual(repository.state.ubah[0].passwordHash, repository.state.ubah[1].passwordHash);
});

test('an administrator account is refused and nothing changes', async () => {
  const repository = fakeRepository([mahasiswa, admin]);
  await assert.rejects(() => resetPasswordMahasiswa({ email: 'admin@example.invalid', repository }), (e) => e instanceof ResetPasswordError && /hanya untuk akun mahasiswa/i.test(e.message));
  assert.equal(repository.state.ubah.length, 0);
});

test('an unknown or empty email is refused with a clear message and nothing changes', async () => {
  const repository = fakeRepository([mahasiswa]);
  await assert.rejects(() => resetPasswordMahasiswa({ email: 'tidak-ada@example.invalid', repository }), (e) => e instanceof ResetPasswordError && /Tidak ada akun/.test(e.message));
  for (const kosong of [undefined, '', '   ']) {
    await assert.rejects(() => resetPasswordMahasiswa({ email: kosong, repository }), (e) => e instanceof ResetPasswordError && /reset-password/.test(e.message));
  }
  assert.equal(repository.state.ubah.length, 0);
});

test('the password is never logged: no console output while resetting, and the module never writes it anywhere', async () => {
  const keluaran = [];
  const asli = {};
  for (const nama of ['log', 'info', 'warn', 'error', 'debug']) {
    asli[nama] = console[nama];
    console[nama] = (...args) => keluaran.push(args.join(' '));
  }
  let hasil;
  try {
    hasil = await resetPasswordMahasiswa({ email: mahasiswa.email, repository: fakeRepository([mahasiswa]) });
  } finally {
    for (const nama of Object.keys(asli)) console[nama] = asli[nama];
  }
  assert.ok(hasil.passwordSementara);
  assert.deepEqual(keluaran.filter((k) => k.includes(hasil.passwordSementara)), []);
  assert.equal(keluaran.length, 0);

  // the module has no console calls and no file writes at all
  const sumber = readFileSync(new URL('../src/services/resetPassword.js', import.meta.url), 'utf8');
  assert.doesNotMatch(sumber, /console\.|writeFile|appendFile|createWriteStream/);
});

test('the script prints the password once to the terminal and has no file or log writes', () => {
  const skrip = readFileSync(new URL('../scripts/reset-password.js', import.meta.url), 'utf8');
  assert.equal((skrip.match(/passwordSementara/g) ?? []).length, 1); // used in one place only: the single print
  assert.match(skrip, /process\.stdout\.write/);
  assert.doesNotMatch(skrip, /writeFile|appendFile|createWriteStream|console\.log/);
  // the error path prints only the message
  assert.match(skrip, /console\.error\(err instanceof ResetPasswordError \? err\.message/);

  const paket = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(paket.scripts['reset-password'], 'node scripts/reset-password.js');
});
