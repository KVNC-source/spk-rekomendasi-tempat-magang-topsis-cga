import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ambilKonfigEngine, kanonik, sidikData, sidikProfil } from '../src/lib/sidikJari.js';
import { kompetensiRows, kriteriaRows, mahasiswa, tempatRows } from './fixtures-db.js';

const data = (ubah = {}) => ({ tempatRows, kompetensiRows, kriteriaRows: kriteriaRows(), ...ubah });
const salin = (x) => structuredClone(x);
const dasar = sidikData(data());

// --- canonical form: the same data always gives the same fingerprint

test('kanonik: object keys are sorted, array order is kept', () => {
  assert.equal(JSON.stringify(kanonik({ b: 1, a: { d: 1, c: [{ z: 1, y: 2 }, 3] } })), '{"a":{"c":[{"y":2,"z":1},3],"d":1},"b":1}');
});

test('sidikData: the same data gives the same fingerprint, a 64-character SHA-256 hex', () => {
  assert.match(dasar, /^[0-9a-f]{64}$/);
  assert.equal(sidikData(data()), dasar);
  assert.equal(sidikData(data({ tempatRows: salin(tempatRows) })), dasar);
});

test('sidikData: row order does not matter (tempat, kebutuhan, kriteria, kompetensi)', () => {
  const tempatTerbalik = salin(tempatRows).reverse().map((t) => ({ ...t, kebutuhan_kompetensi: [...t.kebutuhan_kompetensi].reverse() }));
  const diacak = data({
    tempatRows: tempatTerbalik,
    kriteriaRows: kriteriaRows().reverse(),
    kompetensiRows: [...kompetensiRows].reverse(),
  });
  assert.equal(sidikData(diacak), dasar);
});

test('sidikData: Decimal values are compared as fixed-point numbers, not by how they are written', () => {
  // Prisma hands back Decimal; the same number can be written "0.3", "0.30" or 0.3000
  const kriteria = kriteriaRows().map((k) => (k.kode_kriteria === 'C2' ? { ...k, bobot: '0.2000' } : k));
  const kriteriaLain = kriteriaRows().map((k) => (k.kode_kriteria === 'C2' ? { ...k, bobot: 0.2 } : k));
  assert.equal(sidikData(data({ kriteriaRows: kriteria })), sidikData(data({ kriteriaRows: kriteriaLain })));
  assert.equal(sidikData(data({ kriteriaRows: kriteria })), dasar); // C2 is 0.20 in the fixture

  const tulisan = (t, ubah) => ({ ...t, ...ubah });
  const t05 = tempatRows.find((t) => t.latitude !== null && t.benefit_finansial !== null);
  const ditulisLain = tempatRows.map((t) =>
    t === t05 ? tulisan(t, { latitude: Number(t.latitude), longitude: `${Number(t.longitude)}0`, benefit_finansial: Number(t.benefit_finansial) }) : t
  );
  assert.equal(sidikData(data({ tempatRows: ditulisLain })), dasar);
});

// --- a real change gives a different fingerprint

test('sidikData: changing a kriteria weight, tipe or name changes it', () => {
  const ubahKriteria = (kode, ubah) => data({ kriteriaRows: kriteriaRows().map((k) => (k.kode_kriteria === kode ? { ...k, ...ubah } : k)) });
  assert.notEqual(sidikData(ubahKriteria('C4', { bobot: '0.3100' })), dasar);
  assert.notEqual(sidikData(ubahKriteria('C4', { tipe: 'benefit' })), dasar);
  assert.notEqual(sidikData(ubahKriteria('C4', { nama_kriteria: 'Jarak lain' })), dasar);
});

test('sidikData: changing, adding or deleting a tempat magang or one of its kebutuhan changes it', () => {
  const ubahTempat = (kode, ubah) => data({ tempatRows: tempatRows.map((t) => (t.kode_tempat === kode ? { ...t, ...ubah } : t)) });
  assert.notEqual(sidikData(ubahTempat('T05', { nama_perusahaan: 'Nama baru' })), dasar);
  assert.notEqual(sidikData(ubahTempat('T05', { latitude: '1.000000' })), dasar);
  assert.notEqual(sidikData(ubahTempat('T05', { status_alternatif: 'Dikeluarkan' })), dasar);
  assert.notEqual(sidikData(ubahTempat('T05', { mode_kerja: 'Remote' })), dasar);

  const t05 = tempatRows.find((t) => t.kode_tempat === 'T05');
  const kebutuhanBaru = (ubah) => ubahTempat('T05', { kebutuhan_kompetensi: t05.kebutuhan_kompetensi.map((k, i) => (i === 0 ? { ...k, ...ubah } : k)) });
  assert.notEqual(sidikData(kebutuhanBaru({ level_minimum: t05.kebutuhan_kompetensi[0].level_minimum + 1 })), dasar);
  assert.notEqual(sidikData(kebutuhanBaru({ is_mandatory: !t05.kebutuhan_kompetensi[0].is_mandatory })), dasar);
  assert.notEqual(sidikData(ubahTempat('T05', { kebutuhan_kompetensi: t05.kebutuhan_kompetensi.slice(1) })), dasar);

  assert.notEqual(sidikData(data({ tempatRows: tempatRows.filter((t) => t.kode_tempat !== 'T05') })), dasar); // deleted
  assert.notEqual(sidikData(data({ tempatRows: [...tempatRows, { ...t05, tempat_id: 99, kode_tempat: 'T99' }] })), dasar); // added
});

test('sidikData: renaming a kompetensi changes it', () => {
  const diubah = kompetensiRows.map((k) => (k.kode_kompetensi === 'K01' ? { ...k, nama_kompetensi: 'Nama lain' } : k));
  assert.notEqual(sidikData(data({ kompetensiRows: diubah })), dasar);
});

// --- the engine configuration is part of sidik_data

test('ambilKonfigEngine: carries the C2 table, the C5/C6 fallback, the remote pattern and the engine version', () => {
  const k = ambilKonfigEngine();
  assert.equal(k.versi, '0.3.0');
  assert.deepEqual([k.c2.identik, k.c2.serumpun, k.c2.tidakRelevan], [100, 50, 0]);
  assert.equal(k.c2.pasangan.length, 7);
  assert.ok(k.c2.pasangan.every((p) => p.length === 2 && p[0] <= p[1])); // each pair in a fixed order
  assert.deepEqual(k.nilaiTanpaData, { C5: 1, C6: 3 });
  assert.deepEqual(k.polaRemote, { sumber: 'remote|wfh', flag: 'i' });
  assert.equal(sidikData(data(), ambilKonfigEngine()), dasar); // the default IS the current config
});

test('sidikData: a change in the engine config (C2 table, fallback, remote pattern, version) changes it', () => {
  const dengan = (ubah) => sidikData(data(), { ...salin(ambilKonfigEngine()), ...ubah });
  const k = ambilKonfigEngine();

  // the dosen pembimbing may still change the C2 table: every part of it must show up
  assert.notEqual(dengan({ c2: { ...k.c2, serumpun: 60 } }), dasar);
  assert.notEqual(dengan({ c2: { ...k.c2, identik: 90 } }), dasar);
  assert.notEqual(dengan({ c2: { ...k.c2, tidakRelevan: 10 } }), dasar);
  assert.notEqual(dengan({ c2: { ...k.c2, pasangan: k.c2.pasangan.slice(1) } }), dasar);
  assert.notEqual(dengan({ c2: { ...k.c2, pasangan: [...k.c2.pasangan, ['Data Science', 'IT Support']] } }), dasar);

  assert.notEqual(dengan({ nilaiTanpaData: { C5: 2, C6: 3 } }), dasar);
  assert.notEqual(dengan({ polaRemote: { sumber: 'remote|wfh|hybrid', flag: 'i' } }), dasar);
  assert.notEqual(dengan({ versi: '0.4.0' }), dasar);
  assert.equal(dengan({ versi: k.versi }), dasar);
});

// --- the profile fingerprint

const profilDasar = sidikProfil(mahasiswa, kompetensiRows);
const profil = (ubah, jawaban = mahasiswa.kompetensi_mahasiswa) => sidikProfil({ ...mahasiswa, ...ubah, kompetensi_mahasiswa: jawaban }, kompetensiRows);

test('sidikProfil: the same profile gives the same fingerprint; saving it again unchanged does not move it', () => {
  assert.match(profilDasar, /^[0-9a-f]{64}$/);
  assert.equal(profil({ diperbarui_pada: new Date() }), profilDasar); // diperbarui_pada is not an input
  assert.equal(profil({ ipk: 3.45, domisili_latitude: 1.4748, domisili_longitude: '124.842100' }), profilDasar); // Decimal spelled differently
  assert.equal(profil({}, [...mahasiswa.kompetensi_mahasiswa].reverse()), profilDasar); // answer order
  assert.equal(profil({ kota_domisili: 'Kota lain' }), profilDasar); // only the coordinates reach the engine
});

test('sidikProfil: IPK, minat, coordinates, either count or any level changes it', () => {
  assert.notEqual(profil({ ipk: '3.46' }), profilDasar);
  assert.notEqual(profil({ minat_bidang: 'Data Science' }), profilDasar);
  assert.notEqual(profil({ domisili_latitude: '1.5' }), profilDasar);
  assert.notEqual(profil({ domisili_longitude: '124.9' }), profilDasar);
  assert.notEqual(profil({ jumlah_proyek: 3 }), profilDasar);
  assert.notEqual(profil({ jumlah_sertifikasi: 1 }), profilDasar);
  assert.notEqual(profil({ jumlah_proyek: null }), profilDasar);
  const naik = mahasiswa.kompetensi_mahasiswa.map((km, i) => (i === 0 ? { ...km, level_penguasaan: km.level_penguasaan + 1 } : km));
  assert.notEqual(profil({}, naik), profilDasar);
});

test('sidikProfil: an unanswered kompetensi and an explicit level 0 are the same to the engine, so the same fingerprint', () => {
  const k06 = mahasiswa.kompetensi_mahasiswa.find((km) => km.kompetensi.kode_kompetensi === 'K06');
  assert.equal(k06.level_penguasaan, 0); // the sample answers K06 with an explicit 0
  assert.equal(profil({}, mahasiswa.kompetensi_mahasiswa.filter((km) => km !== k06)), profilDasar);
});
