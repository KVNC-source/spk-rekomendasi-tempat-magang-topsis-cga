import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validasiProfil } from '../src/services/validasi-profil.js';
import { BIDANG } from '../src/engine/src/config.js';
import { DAFTAR_KOTA } from '../src/lib/kotaDomisili.js';

const SKALA = new Map([
  ['K01', 4],
  ['K02', 4],
]);

const sah = () => ({
  ipk: 3.45,
  minat_bidang: 'Web Development',
  domisili: { kota: 'Manado', lat: 0, lon: 0 },
  jumlah_proyek: 2,
  jumlah_sertifikasi: 1,
  kompetensi: [
    { kompetensi_id: 'K01', level_penguasaan: 3 },
    { kompetensi_id: 'K02', level_penguasaan: 0 },
  ],
});

const cek = (ubah) => validasiProfil({ ...sah(), ...ubah }, SKALA);

test('validasiProfil: a complete valid profile has no errors; the kota coordinates come from the master list', () => {
  const { data, kesalahan } = validasiProfil(sah(), SKALA);
  assert.deepEqual(kesalahan, {});
  assert.equal(data.ipk, 3.45);
  assert.equal(data.minat_bidang, 'Web Development');
  // the request said lat 0 / lon 0: it is ignored, the master list wins
  const manado = DAFTAR_KOTA.find((k) => k.kota === 'Manado');
  assert.equal(data.domisili.lat, manado.lat);
  assert.equal(data.domisili.lon, manado.lon);
  assert.deepEqual(data.kompetensi, [{ kode: 'K01', level: 3 }, { kode: 'K02', level: 0 }]);
});

test('validasiProfil: a draft is accepted: every data field may be empty and the kompetensi list partial', () => {
  const { data, kesalahan } = validasiProfil(
    { ipk: null, minat_bidang: '', domisili: null, jumlah_proyek: null, jumlah_sertifikasi: '', kompetensi: [] },
    SKALA
  );
  assert.deepEqual(kesalahan, {});
  assert.deepEqual(
    { ipk: data.ipk, minat: data.minat_bidang, domisili: data.domisili, p: data.jumlah_proyek, s: data.jumlah_sertifikasi },
    { ipk: null, minat: null, domisili: null, p: null, s: null }
  );
  assert.deepEqual(data.kompetensi, []);
});

test('validasiProfil: IPK must be a number from 0 to 4 with at most two decimals', () => {
  for (const salah of [-0.01, 4.01, 5, 'abc', 3.456, {}, true]) {
    assert.ok(cek({ ipk: salah }).kesalahan.ipk, `IPK ${JSON.stringify(salah)} must be rejected`);
  }
  for (const benar of [0, 4, 3.5, '3,45', '3.45', ' 2.1 ']) {
    assert.equal(cek({ ipk: benar }).kesalahan.ipk, undefined, `IPK ${JSON.stringify(benar)} must be accepted`);
  }
  assert.equal(cek({ ipk: '3,45' }).data.ipk, 3.45);
});

test('validasiProfil: a kota outside the master list is rejected, with or without coordinates', () => {
  assert.ok(cek({ domisili: { kota: 'Atlantis', lat: 1, lon: 1 } }).kesalahan.domisili);
  assert.ok(cek({ domisili: { lat: 1.4748, lon: 124.8421 } }).kesalahan.domisili);
  assert.ok(cek({ domisili: 'Kota Antah Berantah' }).kesalahan.domisili);
  assert.ok(cek({ domisili: 42 }).kesalahan.domisili);
  assert.equal(cek({ domisili: { kota: ' manado ' } }).kesalahan.domisili, undefined); // case and spacing do not matter
  assert.equal(cek({ domisili: { kota: ' manado ' } }).data.domisili.kota, 'Manado'); // stored as the list spells it
});

test('validasiProfil: a minat bidang outside the engine BIDANG list is rejected; all 7 values are accepted', () => {
  assert.equal(BIDANG.length, 7);
  assert.ok(cek({ minat_bidang: 'QA' }).kesalahan.minat_bidang);
  assert.ok(cek({ minat_bidang: 'web development' }).kesalahan.minat_bidang); // exact engine value
  assert.ok(cek({ minat_bidang: 7 }).kesalahan.minat_bidang);
  for (const b of BIDANG) assert.equal(cek({ minat_bidang: b }).kesalahan.minat_bidang, undefined, b);
});

test('validasiProfil: the two counts are whole numbers from 0 to 99; 0 is a real answer', () => {
  for (const salah of [-1, 1.5, 100, 'dua', '1.5', {}]) {
    assert.ok(cek({ jumlah_proyek: salah }).kesalahan.jumlah_proyek, `proyek ${JSON.stringify(salah)}`);
    assert.ok(cek({ jumlah_sertifikasi: salah }).kesalahan.jumlah_sertifikasi, `sertifikasi ${JSON.stringify(salah)}`);
  }
  assert.equal(cek({ jumlah_proyek: 0 }).data.jumlah_proyek, 0);
  assert.equal(cek({ jumlah_sertifikasi: '99' }).data.jumlah_sertifikasi, 99);
});

test('validasiProfil: kompetensi must be a list of known codes with levels 0..skala, each at most once', () => {
  assert.ok(validasiProfil({ ...sah(), kompetensi: undefined }, SKALA).kesalahan.kompetensi); // not silently "wipe everything"
  assert.ok(cek({ kompetensi: 'K01' }).kesalahan.kompetensi);
  assert.ok(cek({ kompetensi: [{ kompetensi_id: 'K99', level_penguasaan: 1 }] }).kesalahan.kompetensi);
  assert.ok(cek({ kompetensi: [{ kompetensi_id: 'K01', level_penguasaan: 5 }] }).kesalahan.kompetensi);
  assert.ok(cek({ kompetensi: [{ kompetensi_id: 'K01', level_penguasaan: -1 }] }).kesalahan.kompetensi);
  assert.ok(cek({ kompetensi: [{ kompetensi_id: 'K01', level_penguasaan: 1.5 }] }).kesalahan.kompetensi);
  assert.ok(cek({ kompetensi: [{ kompetensi_id: 'K01', level_penguasaan: null }] }).kesalahan.kompetensi);
  assert.ok(
    cek({ kompetensi: [{ kompetensi_id: 'K01', level_penguasaan: 1 }, { kompetensi_id: 'K01', level_penguasaan: 2 }] }).kesalahan
      .kompetensi
  );
  assert.ok(cek({ kompetensi: [null] }).kesalahan.kompetensi);
});

test('validasiProfil: a body that is not an object reports errors instead of throwing', () => {
  for (const body of [null, undefined, 'x', [], 5]) {
    assert.doesNotThrow(() => validasiProfil(body, SKALA));
    assert.ok(validasiProfil(body, SKALA).kesalahan.kompetensi);
  }
});
