import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { HttpError } from '../src/lib/httpError.js';

async function withServer(rekomendasiService, fn) {
  const server = createApp({ rekomendasiService }).listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

const post = (base, body) =>
  fetch(`${base}/api/rekomendasi`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

test('POST /api/rekomendasi: 200 with the service result as-is (client contract)', async () => {
  const hasil = { profilId: 'M7', ranking: [], excluded: [], warnings: [], dihitungPada: '2026-11-17T08:00:00.000Z' };
  const service = { hitungRekomendasi: async (id) => ({ ...hasil, profilId: `M${id}` }) };
  await withServer(service, async (base) => {
    const res = await post(base, { mahasiswa_id: 7 });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), hasil);
  });
});

test('POST /api/rekomendasi: 400 for a missing / non-integer mahasiswa_id and malformed JSON', async () => {
  const service = { hitungRekomendasi: async () => assert.fail('must not be called') };
  await withServer(service, async (base) => {
    assert.equal((await post(base, {})).status, 400);
    assert.equal((await post(base, { mahasiswa_id: '7' })).status, 400);
    assert.equal((await post(base, { mahasiswa_id: -1 })).status, 400);
    assert.equal((await post(base, '{oops')).status, 400);
  });
});

test('POST /api/rekomendasi: HttpError status and details pass through; unknown errors give 500', async () => {
  const mapped = {
    hitungRekomendasi: async () => {
      throw new HttpError(422, 'gagal', { tidak_dapat_dihitung: [] });
    },
  };
  await withServer(mapped, async (base) => {
    const res = await post(base, { mahasiswa_id: 1 });
    assert.equal(res.status, 422);
    assert.deepEqual(await res.json(), { error: 'gagal', tidak_dapat_dihitung: [] });
  });

  const boom = {
    hitungRekomendasi: async () => {
      throw new Error('db down');
    },
  };
  const original = console.error;
  console.error = () => {};
  try {
    await withServer(boom, async (base) => {
      const res = await post(base, { mahasiswa_id: 1 });
      assert.equal(res.status, 500);
      assert.deepEqual(await res.json(), { error: 'Terjadi kesalahan pada server' });
    });
  } finally {
    console.error = original;
  }
});

test('GET /api/health', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/api/health`);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });
});
