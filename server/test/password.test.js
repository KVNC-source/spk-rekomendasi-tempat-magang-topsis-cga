import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { hashPassword, verifyPassword } from '../src/lib/password.js';

const password = randomBytes(9).toString('hex'); // a throw-away value for this run only

test('hashPassword: scrypt with N=2^14, r=8, p=5 (16 MiB); the cost parameters are stored in the hash', async () => {
  const hash = await hashPassword(password);
  const [name, N, r, p, salt, key] = hash.split('$');
  assert.equal(name, 'scrypt');
  assert.deepEqual([N, r, p].map(Number), [16384, 8, 5]);
  assert.equal(128 * Number(N) * Number(r), 16 * 1024 * 1024);
  assert.equal(Buffer.from(salt, 'base64').length, 16);
  assert.equal(Buffer.from(key, 'base64').length, 64);
  assert.ok(!hash.includes(password));
});

test('verifyPassword: right password matches, wrong or empty one does not', async () => {
  const hash = await hashPassword(password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword(`${password}x`, hash), false);
  assert.equal(await verifyPassword('', hash), false);
});

test('verifyPassword: a hash made with the earlier parameters (N=2^16, r=8, p=1) still verifies', async () => {
  const salt = randomBytes(16);
  const key = await promisify(scrypt)(password.normalize('NFKC'), salt, 64, { N: 2 ** 16, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  const lama = ['scrypt', 65536, 8, 1, salt.toString('base64'), key.toString('base64')].join('$');
  assert.equal(await verifyPassword(password, lama), true);
  assert.equal(await verifyPassword(`${password}x`, lama), false);
});

test('hashPassword: every hash has its own salt', async () => {
  const [a, b] = await Promise.all([hashPassword(password), hashPassword(password)]);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword(password, a), true);
  assert.equal(await verifyPassword(password, b), true);
});

test('verifyPassword: a malformed or oversized stored hash is "no match", not an exception', async () => {
  for (const stored of [
    '',
    'TIDAK-UNTUK-LOGIN',
    'scrypt$65536$8$1$abc',
    'bcrypt$65536$8$1$YWJj$YWJj',
    'scrypt$abc$8$1$YWJj$YWJj',
    'scrypt$65537$8$1$YWJj$YWJj', // N is not a power of two
    `scrypt$${2 ** 20}$8$1$YWJj$YWJj`, // would need more memory than allowed
    undefined,
    null,
  ]) {
    assert.equal(await verifyPassword(password, stored), false, String(stored));
  }
  assert.equal(await verifyPassword(undefined, await hashPassword(password)), false);
});
