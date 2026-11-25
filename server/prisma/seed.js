/**
 * Seeds the database. It only FILLS what is missing; it never overwrites what
 * the Administrator has changed on the admin pages.
 *
 *  1. kriteria_topsis: C1-C7 with the PROVISIONAL literature weights from
 *     Tabel 2.5 (the engine's criteriaC1C7()). Only a code that does not exist
 *     yet is created; existing weights are never touched.
 *  2. role: 'mahasiswa' and 'administrator', created only when missing. The
 *     koordinator magang is not a system user (Batasan 6).
 *  3. kompetensi: the 21 kompetensi (names from the engine's dataset.json,
 *     kategori and deskripsi from prisma/data/kompetensi.json), ONLY when the
 *     table is empty.
 *  4. tempat_magang + kebutuhan_kompetensi: from the engine's dataset.json,
 *     ONLY when the tempat_magang table is empty.
 *  5. Login accounts (log in with the EMAIL): the administrator (SEED_ADMIN_EMAIL, or the CONTOH
 *     one) and the sample mahasiswa. They are created when missing. The one thing re-applied on
 *     every run is the PASSWORD, read from server/.env (SEED_PASSWORD_MAHASISWA,
 *     SEED_PASSWORD_ADMIN), because there is no change-password feature yet. The seed stops if one
 *     is empty. Passwords are never written in code or printed; they are stored as scrypt hashes.
 *  6. ONE sample mahasiswa profile (CONTOH-WEB-MANADO from profil_contoh.json),
 *     ONLY when that mahasiswa row does not exist yet. Not respondent data.
 *     For a row that already exists, only the columns added in Tahap 5 are filled
 *     when they are still empty (kota_domisili, jumlah_proyek, jumlah_sertifikasi),
 *     so the sample account is "Lengkap"; nothing else in the profile is touched.
 *
 * In production (NODE_ENV=production) the rules in src/lib/aturanSeed.js apply: the administrator
 * password needs 12 characters or more, and steps 5 (mahasiswa) and 6 are skipped unless
 * SEED_AKUN_CONTOH=ya.
 *
 * Run: npm run seed
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { criteriaC1C7 } from '../src/engine/src/topsis.js';
import { teksTarget } from '../src/lib/dbTarget.js';
import { rencanaSeed } from '../src/lib/aturanSeed.js';
import { hashPassword } from '../src/lib/password.js';
import { prisma } from '../src/lib/prisma.js';

const readJson = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));

const dataset = readJson('../src/engine/data/dataset.json');
const kompetensiMaster = readJson('./data/kompetensi.json').kompetensi;
const profilContoh = readJson('../src/engine/data/profil_contoh.json').profil.find(
  (p) => p.id === 'CONTOH-WEB-MANADO'
);
if (!profilContoh) throw new Error('profil CONTOH-WEB-MANADO tidak ditemukan di profil_contoh.json');

// --- 0. which database, and what this run may do. Passwords come from the environment only.
console.log(`Database tujuan: ${teksTarget()}`);
const rencana = rencanaSeed();
for (const peringatan of rencana.peringatan) console.warn(`Peringatan: ${peringatan}`);
if (rencana.kesalahan.length > 0) {
  throw new Error(`Seed berhenti: ${rencana.kesalahan.join(' ')}`);
}
const passwordMahasiswa = process.env.SEED_PASSWORD_MAHASISWA ?? '';
const passwordAdmin = process.env.SEED_PASSWORD_ADMIN ?? '';

const ringkasan = [];

// --- 1. kriteria_topsis: create only the codes that are missing
let kriteriaBaru = 0;
for (const c of criteriaC1C7()) {
  const ada = await prisma.kriteriaTopsis.findUnique({ where: { kode_kriteria: c.code } });
  if (ada) continue;
  await prisma.kriteriaTopsis.create({
    data: { kode_kriteria: c.code, nama_kriteria: c.label, bobot: c.weight, tipe: c.type },
  });
  kriteriaBaru += 1;
}
ringkasan.push(kriteriaBaru > 0 ? `kriteria: ${kriteriaBaru} dibuat` : 'kriteria: sudah ada, bobot tidak diubah');

// --- 2. role: create only when missing (matched without caring about case, never renamed)
const ROLES = ['mahasiswa', 'administrator'];
const roleByName = new Map();
for (const nama_role of ROLES) {
  const ada = await prisma.role.findFirst({ where: { nama_role: { equals: nama_role, mode: 'insensitive' } } });
  roleByName.set(nama_role, ada ?? (await prisma.role.create({ data: { nama_role } })));
}

// --- 3. kompetensi: only when the table is empty
if ((await prisma.kompetensi.count()) === 0) {
  const masterById = new Map(kompetensiMaster.map((k) => [k.id, k]));
  for (const k of dataset.kompetensi) {
    const master = masterById.get(k.id);
    if (!master) throw new Error(`kompetensi ${k.id} tidak ada di prisma/data/kompetensi.json`);
    await prisma.kompetensi.create({
      data: {
        kode_kompetensi: k.id,
        nama_kompetensi: master.nama ?? k.nama,
        kategori: master.kategori,
        deskripsi: master.deskripsi ?? null,
        skala_maksimum: 4,
      },
    });
  }
  ringkasan.push(`kompetensi: ${dataset.kompetensi.length} dibuat (tabel kosong)`);
} else {
  ringkasan.push('kompetensi: dilewati (tabel sudah berisi)');
}
const kompetensiIdByKode = new Map(
  (await prisma.kompetensi.findMany({ select: { kompetensi_id: true, kode_kompetensi: true } })).map((k) => [
    k.kode_kompetensi,
    k.kompetensi_id,
  ])
);

// --- 4. tempat_magang + kebutuhan_kompetensi: only when tempat_magang is empty
if ((await prisma.tempatMagang.count()) === 0) {
  const tempatIdByKode = new Map();
  for (const t of dataset.tempat) {
    const row = await prisma.tempatMagang.create({
      data: {
        kode_tempat: t.tempatId,
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
      },
    });
    tempatIdByKode.set(t.tempatId, row.tempat_id);
  }
  let dilewati = 0;
  for (const k of dataset.kebutuhan) {
    const tempat_id = tempatIdByKode.get(k.tempatId);
    const kompetensi_id = kompetensiIdByKode.get(k.kompetensiId);
    if (!tempat_id || !kompetensi_id) {
      dilewati += 1; // the kompetensi no longer exists in the database
      continue;
    }
    await prisma.kebutuhanKompetensi.create({
      data: { tempat_id, kompetensi_id, level_minimum: k.levelMinimum, is_mandatory: k.jenis === 'wajib' },
    });
  }
  ringkasan.push(
    `tempat magang: ${dataset.tempat.length} dibuat, kebutuhan: ${dataset.kebutuhan.length - dilewati} dibuat (tabel kosong)` +
      (dilewati ? `, ${dilewati} kebutuhan dilewati karena kompetensinya tidak ada` : '')
  );
} else {
  ringkasan.push('tempat magang dan kebutuhan: dilewati (tabel sudah berisi)');
}

// --- 5. login accounts (CONTOH). The email is the login identifier: stored trimmed and lower-case.
// An existing account keeps its username, role and status; only the password is set again.
async function pastikanAkun({ email, username, role_id, password }) {
  const hash = await hashPassword(password);
  const ada = await prisma.user.findUnique({ where: { email } });
  if (ada) return prisma.user.update({ where: { user_id: ada.user_id }, data: { password: hash } });
  return prisma.user.create({ data: { email, username, role_id, password: hash, status: 'aktif' } });
}

// The sample mahasiswa only on a laptop, or in production when SEED_AKUN_CONTOH=ya (see src/lib/aturanSeed.js).
const user = rencana.buatAkunContoh
  ? await pastikanAkun({
      email: 'contoh-web-manado@example.invalid',
      username: 'contoh-web-manado',
      role_id: roleByName.get('mahasiswa').role_id,
      password: passwordMahasiswa,
    })
  : null;
// The administrator: SEED_ADMIN_EMAIL, or the CONTOH email when it is not set.
const admin = await pastikanAkun({
  email: rencana.emailAdmin,
  username: rencana.usernameAdmin,
  role_id: roleByName.get('administrator').role_id,
  password: passwordAdmin,
});
ringkasan.push(
  rencana.buatAkunContoh
    ? 'akun administrator dan akun CONTOH mahasiswa: password disetel ulang dari env'
    : 'akun administrator: password disetel ulang dari env; akun CONTOH mahasiswa tidak dibuat'
);

// --- 6. sample mahasiswa profile (CONTOH): only when this mahasiswa does not exist yet
// Kota from profil_contoh.json; 2 proyek + 2 sertifikasi are sample numbers (score 4, as in that file).
const ISIAN_TAHAP_5 = { kota_domisili: profilContoh.domisili.kota, jumlah_proyek: 2, jumlah_sertifikasi: 2 };
if (!user) {
  ringkasan.push('mahasiswa CONTOH: tidak dibuat (produksi tanpa SEED_AKUN_CONTOH=ya)');
} else if (!(await prisma.mahasiswa.findUnique({ where: { user_id: user.user_id } }))) {
  const mahasiswa = await prisma.mahasiswa.create({
    data: {
      user_id: user.user_id,
      nim: 'CONTOH-0001',
      nama: 'CONTOH Mahasiswa Web Manado',
      angkatan: 2023, // placeholder: profil_contoh.json has no angkatan
      ipk: profilContoh.ipk,
      minat_bidang: profilContoh.minatBidang,
      domisili_latitude: profilContoh.domisili.lat,
      domisili_longitude: profilContoh.domisili.lon,
      ...ISIAN_TAHAP_5,
    },
  });
  // profil_contoh.json lists 13 of 21; the others mean "tidak dimiliki", stored as an explicit level 0.
  for (const [kode, kompetensi_id] of kompetensiIdByKode) {
    await prisma.kompetensiMahasiswa.create({
      data: { mahasiswa_id: mahasiswa.mahasiswa_id, kompetensi_id, level_penguasaan: profilContoh.kompetensi[kode] ?? 0 },
    });
  }
  ringkasan.push(`mahasiswa CONTOH: dibuat (mahasiswa_id=${mahasiswa.mahasiswa_id}) dengan ${kompetensiIdByKode.size} level`);
} else {
  // Fill only what the Tahap 5 migration added and left empty; never overwrite an answer.
  const ada = await prisma.mahasiswa.findUnique({ where: { user_id: user.user_id } });
  const isi = Object.fromEntries(Object.entries(ISIAN_TAHAP_5).filter(([kolom]) => ada[kolom] == null));
  if (Object.keys(isi).length > 0) {
    await prisma.mahasiswa.update({ where: { mahasiswa_id: ada.mahasiswa_id }, data: isi });
    ringkasan.push(`mahasiswa CONTOH: dilengkapi (${Object.keys(isi).join(', ')}), isian lain tidak diubah`);
  } else {
    ringkasan.push('mahasiswa CONTOH: dilewati (sudah ada, profil tidak diubah)');
  }
}

console.log(`Seed selesai. ${ringkasan.join('; ')}.`);
console.log(
  `Akun masuk: ${user ? `${user.email} (mahasiswa), ` : ''}${admin.email} (administrator); password dari environment.`
);
await prisma.$disconnect();
