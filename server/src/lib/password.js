/**
 * Password hashing with scrypt from node:crypto (no dependency).
 *
 * Stored format: scrypt$N$r$p$salt$hash   (salt and hash in base64)
 * The cost parameters travel with the hash, so they can be raised later and
 * old hashes keep verifying.
 *
 * Memory: scrypt needs about 128 * N * r bytes. New hashes use N=2^14, r=8, p=5: 16 MiB, one of
 * the equal-strength settings OWASP lists for scrypt (N=2^17/p=1, 2^16/p=2, 2^15/p=3, 2^14/p=5,
 * 2^13/p=10). A small instance (512 MiB) hashes up to 4 passwords at once (Node's thread pool),
 * so 16 MiB each keeps the peak low. The first accounts were hashed with N=2^16, r=8, p=1 (64 MiB);
 * those hashes still verify, because their parameters are read from the stored hash.
 * Node's default limit is 32 MiB and would throw "memory limit exceeded" for the old ones, so
 * maxmem is set explicitly to 128 MiB.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export const COST = Object.freeze({ N: 2 ** 14, r: 8, p: 5 });
const KEY_BYTES = 64;
const SALT_BYTES = 16;
const MAX_MEMORY = 128 * 1024 * 1024;

/** A stored hash may not ask for more than half of MAX_MEMORY, so a bad row cannot exhaust memory. */
const memoryNeeded = ({ N, r }) => 128 * N * r;

const derive = (password, salt, { N, r, p }, keyBytes) =>
  scryptAsync(password.normalize('NFKC'), salt, keyBytes, { N, r, p, maxmem: MAX_MEMORY });

export async function hashPassword(plain) {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(plain, salt, COST, KEY_BYTES);
  return ['scrypt', COST.N, COST.r, COST.p, salt.toString('base64'), key.toString('base64')].join('$');
}

/** True only for a well-formed hash that matches. Malformed input is "no match", never an exception. */
export async function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [N, r, p] = parts.slice(1, 4).map(Number);
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  const params = { N, r, p };
  if (![N, r, p].every(Number.isInteger) || N < 2 || (N & (N - 1)) !== 0 || r < 1 || p < 1) return false;
  if (memoryNeeded(params) > MAX_MEMORY / 2 || salt.length === 0 || expected.length === 0) return false;

  const actual = await derive(plain, salt, params, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
