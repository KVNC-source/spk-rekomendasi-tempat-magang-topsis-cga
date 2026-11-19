/**
 * Seeds the database.
 *
 *  1. kriteria_topsis: C1–C7 with the PROVISIONAL literature weights from
 *     Tabel 2.5 (the engine's criteriaC1C7()). Existing rows are left untouched
 *     so weights edited by the Administrator are never overwritten.
 *  2. kompetensi: the 21 kompetensi. Names come from the engine's dataset.json,
 *     kategori and deskripsi from prisma/data/kompetensi.json (matched by
 *     id "K01" = kode_kompetensi).
 *  3. tempat_magang + kebutuhan_kompetensi: from the engine's dataset.json
 *     (generated from the xlsx, so it is the source of truth for these rows).
 *     Re-running this script re-syncs them; it does not duplicate rows.
 *  4. role: only 'mahasiswa' and 'administrator'. The koordinator magang is not
 *     a system user (approval happens outside the system, Batasan 6).
 *  5. ONE sample mahasiswa (clearly marked CONTOH) from the engine's
 *     profil_contoh.json, profile CONTOH-WEB-MANADO. Not respondent data.
 *
 * Run: npm run seed
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { criteriaC1C7 } from '../src/engine/src/topsis.js';
import { prisma } from '../src/lib/prisma.js';

const readJson = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));

const dataset = readJson('../src/engine/data/dataset.json');
const kompetensiMaster = readJson('./data/kompetensi.json').kompetensi;
const profilContoh = readJson('../src/engine/data/profil_contoh.json').profil.find(
  (p) => p.id === 'CONTOH-WEB-MANADO'
);
if (!profilContoh) throw new Error('profil CONTOH-WEB-MANADO tidak ditemukan di profil_contoh.json');

// --- 1. kriteria_topsis
for (const c of criteriaC1C7()) {
  await prisma.kriteriaTopsis.upsert({
    where: { kode_kriteria: c.code },
    update: {},
    create: { kode_kriteria: c.code, nama_kriteria: c.label, bobot: c.weight, tipe: c.type },
  });
}

// --- 2. kompetensi
const masterById = new Map(kompetensiMaster.map((k) => [k.id, k]));
const kompetensiIdByKode = new Map();
for (const k of dataset.kompetensi) {
  const master = masterById.get(k.id);
  if (!master) throw new Error(`kompetensi ${k.id} tidak ada di prisma/data/kompetensi.json`);
  const data = {
    nama_kompetensi: master.nama ?? k.nama,
    kategori: master.kategori,
    deskripsi: master.deskripsi ?? null,
    skala_maksimum: 4,
  };
  const row = await prisma.kompetensi.upsert({
    where: { kode_kompetensi: k.id },
    update: data,
    create: { kode_kompetensi: k.id, ...data },
  });
  kompetensiIdByKode.set(k.id, row.kompetensi_id);
}

// --- 3. tempat_magang + kebutuhan_kompetensi
const tempatIdByKode = new Map();
for (const t of dataset.tempat) {
  const data = {
    nama_perusahaan: t.namaPerusahaan,
    posisi: t.posisi,
    bidang_industri: t.bidang,
    lokasi: t.lokasi,
    mode_kerja: t.modeKerja ?? null,
    latitude: t.lat ?? null,
    longitude: t.lon ?? null,
    benefit_finansial: t.benefitFinansial ?? null,
    reputasi: t.reputasi ?? null,
    status_alternatif: t.statusAlternatif,
    alasan_dikeluarkan: t.alasanDikeluarkan ?? null,
    sumber_url: t.sumberUrl ?? null,
    tanggal_akses: t.tanggalAkses ? new Date(`${t.tanggalAkses}T00:00:00Z`) : null,
  };
  const row = await prisma.tempatMagang.upsert({
    where: { kode_tempat: t.tempatId },
    update: data,
    create: { kode_tempat: t.tempatId, ...data },
  });
  tempatIdByKode.set(t.tempatId, row.tempat_id);
}

for (const k of dataset.kebutuhan) {
  const tempat_id = tempatIdByKode.get(k.tempatId);
  const kompetensi_id = kompetensiIdByKode.get(k.kompetensiId);
  if (!tempat_id || !kompetensi_id) throw new Error(`kebutuhan ${k.kebutuhanId}: tempat atau kompetensi tidak dikenal`);
  const data = { level_minimum: k.levelMinimum, is_mandatory: k.jenis === 'wajib' };
  await prisma.kebutuhanKompetensi.upsert({
    where: { tempat_id_kompetensi_id: { tempat_id, kompetensi_id } },
    update: data,
    create: { tempat_id, kompetensi_id, ...data },
  });
}

// --- 4. role
const ROLES = ['mahasiswa', 'administrator'];
const roleByName = new Map();
for (const nama_role of ROLES) {
  // Match case-insensitively so an older 'Mahasiswa' row is renamed, not duplicated.
  const existing = await prisma.role.findFirst({ where: { nama_role: { equals: nama_role, mode: 'insensitive' } } });
  const row = existing
    ? await prisma.role.update({ where: { role_id: existing.role_id }, data: { nama_role } })
    : await prisma.role.create({ data: { nama_role } });
  roleByName.set(nama_role, row);
}
const role = roleByName.get('mahasiswa');

// --- 5. sample mahasiswa (CONTOH)
const USERNAME = 'contoh-web-manado';
let user = await prisma.user.findFirst({ where: { username: USERNAME } });
if (!user) {
  user = await prisma.user.create({
    data: {
      role_id: role.role_id,
      username: USERNAME,
      // Not a real credential: there is no login yet, so this account cannot sign in.
      password: 'TIDAK-UNTUK-LOGIN',
      email: 'contoh-web-manado@example.invalid',
      status: 'contoh',
    },
  });
}

const mahasiswaData = {
  nim: 'CONTOH-0001',
  nama: 'CONTOH Mahasiswa Web Manado',
  angkatan: 2023, // placeholder: profil_contoh.json has no angkatan
  ipk: profilContoh.ipk,
  minat_bidang: profilContoh.minatBidang,
  domisili_latitude: profilContoh.domisili.lat,
  domisili_longitude: profilContoh.domisili.lon,
};
const mahasiswa = await prisma.mahasiswa.upsert({
  where: { user_id: user.user_id },
  update: mahasiswaData,
  create: { user_id: user.user_id, ...mahasiswaData },
});

// The profile is complete only when every kompetensi has an explicit answer.
// profil_contoh.json lists 13 of 21; the others mean "tidak dimiliki", so they
// are stored as an explicit level 0 here.
for (const [kode, kompetensi_id] of kompetensiIdByKode) {
  const level_penguasaan = profilContoh.kompetensi[kode] ?? 0;
  await prisma.kompetensiMahasiswa.upsert({
    where: { mahasiswa_id_kompetensi_id: { mahasiswa_id: mahasiswa.mahasiswa_id, kompetensi_id } },
    update: { level_penguasaan },
    create: { mahasiswa_id: mahasiswa.mahasiswa_id, kompetensi_id, level_penguasaan },
  });
}

console.log(
  `Seeded: ${kompetensiIdByKode.size} kompetensi, ${tempatIdByKode.size} tempat magang, ` +
    `${dataset.kebutuhan.length} kebutuhan, role ${ROLES.join(', ')}, kriteria C1-C7 (existing weights untouched), ` +
    `sample mahasiswa_id=${mahasiswa.mahasiswa_id} (${mahasiswa.nama}).`
);
await prisma.$disconnect();
