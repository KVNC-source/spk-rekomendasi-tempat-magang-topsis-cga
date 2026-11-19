import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from '../src/lib/httpError.js';
import { cookie, sendJson, withApp } from './helpers.js';

const post = (base, body, headers) => sendJson('POST', `${base}/api/rekomendasi`, body, headers);

test('POST /api/rekomendasi: 200 with the service result; the mahasiswa comes from the session, not the body', async () => {
  const hasil = { profilId: 'M7', ranking: [], excluded: [], warnings: [], dihitungPada: '2026-11-17T08:00:00.000Z' };
  const dipanggil = [];
  const rekomendasiService = {
    hitungRekomendasi: async (id) => {
      dipanggil.push(id);
      return hasil;
    },
  };
  await withApp({ rekomendasiService }, async (base) => {
    // the body tries to name another mahasiswa; it is ignored
    const res = await post(base, { mahasiswa_id: 999 }, cookie('tok-mhs'));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), hasil);
    assert.deepEqual(dipanggil, [7]);

    // the client sends {} and that works too
    assert.equal((await post(base, {}, cookie('tok-mhs'))).status, 200);
  });
});

test('POST /api/rekomendasi: 401 without a session, 403 for the administrator, service not called', async () => {
  const rekomendasiService = { hitungRekomendasi: async () => assert.fail('must not be called') };
  await withApp({ rekomendasiService }, async (base) => {
    assert.equal((await post(base, {})).status, 401);
    assert.equal((await post(base, {}, cookie('tok-tidak-dikenal'))).status, 401);
    assert.equal((await post(base, {}, cookie('tok-admin'))).status, 403);
  });
});

test('POST /api/rekomendasi: 400 for malformed JSON', async () => {
  const rekomendasiService = { hitungRekomendasi: async () => assert.fail('must not be called') };
  await withApp({ rekomendasiService }, async (base) => {
    assert.equal((await post(base, '{oops', cookie('tok-mhs'))).status, 400);
  });
});

test('POST /api/rekomendasi: HttpError status and details pass through; unknown errors give 500', async () => {
  const mapped = {
    hitungRekomendasi: async () => {
      throw new HttpError(422, 'gagal', { belum_diisi: ['K05'] });
    },
  };
  await withApp({ rekomendasiService: mapped }, async (base) => {
    const res = await post(base, {}, cookie('tok-mhs'));
    assert.equal(res.status, 422);
    assert.deepEqual(await res.json(), { error: 'gagal', belum_diisi: ['K05'] });
  });

  const boom = {
    hitungRekomendasi: async () => {
      throw new Error('db down');
    },
  };
  const original = console.error;
  console.error = () => {};
  try {
    await withApp({ rekomendasiService: boom }, async (base) => {
      const res = await post(base, {}, cookie('tok-mhs'));
      assert.equal(res.status, 500);
      assert.deepEqual(await res.json(), { error: 'Terjadi kesalahan pada server' });
    });
  } finally {
    console.error = original;
  }
});

test('GET /api/health is public', async () => {
  await withApp({}, async (base) => {
    const res = await fetch(`${base}/api/health`);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });
});
