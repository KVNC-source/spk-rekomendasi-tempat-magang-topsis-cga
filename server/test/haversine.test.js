import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm } from '../src/lib/haversine.js';

test('haversineKm: identical points are 0 km apart', () => {
  assert.equal(haversineKm(1.4748, 124.8421, 1.4748, 124.8421), 0);
});

test('haversineKm: 1 degree of longitude on the equator = 2*pi*6371/360 km', () => {
  const expected = (2 * Math.PI * 6371) / 360; // 111.1949...
  assert.ok(Math.abs(haversineKm(0, 0, 0, 1) - expected) < 1e-9);
});

test('haversineKm: is symmetric', () => {
  const ab = haversineKm(1.49, 124.84, 1.2, 124.5);
  const ba = haversineKm(1.2, 124.5, 1.49, 124.84);
  assert.ok(Math.abs(ab - ba) < 1e-12);
});
