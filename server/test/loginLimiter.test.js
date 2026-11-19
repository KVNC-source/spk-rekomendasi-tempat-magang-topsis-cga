import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoginLimiter } from '../src/lib/loginLimiter.js';

const MENIT = 60 * 1000;

function buat() {
  let t = 1_000_000;
  const limiter = createLoginLimiter({ maxAttempts: 5, windowMs: 15 * MENIT, now: () => t });
  return { limiter, maju: (menit) => (t += menit * MENIT) };
}

test('blocks a key after 5 failures, for 15 minutes', () => {
  const { limiter, maju } = buat();
  for (let i = 0; i < 4; i++) limiter.recordFailure('a');
  assert.equal(limiter.isBlocked('a'), false);
  limiter.recordFailure('a');
  assert.equal(limiter.isBlocked('a'), true);

  maju(14);
  assert.equal(limiter.isBlocked('a'), true);
  maju(1);
  assert.equal(limiter.isBlocked('a'), false);
});

test('keys are independent', () => {
  const { limiter } = buat();
  for (let i = 0; i < 5; i++) limiter.recordFailure('ip1|a@x');
  assert.equal(limiter.isBlocked('ip1|a@x'), true);
  assert.equal(limiter.isBlocked('ip2|a@x'), false);
  assert.equal(limiter.isBlocked('ip1|b@x'), false);
});

test('reset clears the failures; old failures outside the window do not count', () => {
  const { limiter, maju } = buat();
  for (let i = 0; i < 4; i++) limiter.recordFailure('a');
  limiter.reset('a');
  limiter.recordFailure('a');
  assert.equal(limiter.isBlocked('a'), false);

  for (let i = 0; i < 3; i++) limiter.recordFailure('b');
  maju(16); // those 3 are now older than the window
  limiter.recordFailure('b');
  limiter.recordFailure('b');
  assert.equal(limiter.isBlocked('b'), false);
});
