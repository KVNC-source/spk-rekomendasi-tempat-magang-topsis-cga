import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdminService } from '../src/services/admin.service.js';
import { cookie, withApp } from './helpers.js';

const hitungMahasiswa = (kembali) => async () => kembali;

test('ringkasan: reports every mahasiswa, the self-registered ones, and how far those got', async () => {
  const service = createAdminService({
    repository: { hitungMahasiswa: hitungMahasiswa({ terdaftar: 9, mandiri: 8, mandiriDenganHasil: 5, mandiriDenganPilihan: 2 }) },
  });
  assert.deepEqual(await service.ringkasan(), {
    mahasiswa_terdaftar: 9,
    mahasiswa_mandiri: 8,
    mandiri_dengan_rekomendasi: 5,
    mandiri_dengan_pilihan: 2,
  });
});

test('ringkasan: zero is a normal answer', async () => {
  const service = createAdminService({ repository: { hitungMahasiswa: hitungMahasiswa({ terdaftar: 0, mandiri: 0, mandiriDenganHasil: 0, mandiriDenganPilihan: 0 }) } });
  assert.deepEqual(await service.ringkasan(), {
    mahasiswa_terdaftar: 0, mahasiswa_mandiri: 0, mandiri_dengan_rekomendasi: 0, mandiri_dengan_pilihan: 0,
  });
});

test('GET /api/admin/ringkasan: administrator only (401 without a session, 403 for a mahasiswa)', async () => {
  const adminService = {
    ringkasan: async () => ({ mahasiswa_terdaftar: 3, mahasiswa_mandiri: 2, mandiri_dengan_rekomendasi: 1, mandiri_dengan_pilihan: 0 }),
  };
  await withApp({ adminService }, async (base) => {
    assert.equal((await fetch(`${base}/api/admin/ringkasan`)).status, 401);
    assert.equal((await fetch(`${base}/api/admin/ringkasan`, { headers: cookie('tok-mhs') })).status, 403);
    const res = await fetch(`${base}/api/admin/ringkasan`, { headers: cookie('tok-admin') });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).mahasiswa_mandiri, 2);
  });
});
