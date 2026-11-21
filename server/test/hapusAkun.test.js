import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AWALAN_NIM_CONTOH, EMAIL_AKUN_CONTOH } from '../src/config/akunContoh.js';
import { createHapusAkunRepository, URUTAN_TABEL } from '../src/repositories/hapusAkun.repository.js';
import { HapusAkunError, bacaArgumen, hapusAkunMahasiswa } from '../src/services/hapusAkun.js';

// --- an in-memory database with two respondents, the CONTOH sample and an administrator

function buatDb() {
  const t = {
    users: [
      { user_id: 1, email: 'admin@example.invalid', role: { nama_role: 'administrator' }, mahasiswa: null },
      { user_id: 2, email: 'contoh-web-manado@example.invalid', role: { nama_role: 'mahasiswa' }, mahasiswa: { mahasiswa_id: 20, nama: 'Contoh', nim: 'CONTOH-0001' } },
      { user_id: 3, email: 'resp-a@example.invalid', role: { nama_role: 'mahasiswa' }, mahasiswa: { mahasiswa_id: 30, nama: 'Responden A', nim: '230211060001' } },
      { user_id: 4, email: 'resp-b@example.invalid', role: { nama_role: 'mahasiswa' }, mahasiswa: { mahasiswa_id: 40, nama: 'Responden B', nim: '230211060002' } },
    ],
    sesi: [{ u: 3 }, { u: 3 }, { u: 4 }, { u: 1 }],
    kompetensi_mahasiswa: [...Array(21).fill({ m: 30 }), ...Array(21).fill({ m: 40 }), ...Array(21).fill({ m: 20 })],
    hasil_rekomendasi: [{ m: 30 }, { m: 40 }],
    hasil_cga: [...Array(15).fill({ m: 30 }), ...Array(15).fill({ m: 40 })],
    hasil_cga_detail: [...Array(60).fill({ m: 30 }), ...Array(45).fill({ m: 40 })],
    hasil_topsis: [...Array(15).fill({ m: 30 }), ...Array(15).fill({ m: 40 })],
    pilihan: [{ m: 30 }, { m: 40 }],
  };
  const dimiliki = (m, u) => ({
    users: t.users.filter((x) => x.user_id === u).length,
    mahasiswa: t.users.filter((x) => x.mahasiswa?.mahasiswa_id === m).length,
    sesi: t.sesi.filter((x) => x.u === u).length,
    kompetensi_mahasiswa: t.kompetensi_mahasiswa.filter((x) => x.m === m).length,
    hasil_rekomendasi: t.hasil_rekomendasi.filter((x) => x.m === m).length,
    hasil_cga: t.hasil_cga.filter((x) => x.m === m).length,
    hasil_cga_detail: t.hasil_cga_detail.filter((x) => x.m === m).length,
    hasil_topsis: t.hasil_topsis.filter((x) => x.m === m).length,
    pilihan: t.pilihan.filter((x) => x.m === m).length,
  });
  const panggilan = { hitung: [], hapus: [] };
  const repository = {
    panggilan,
    tabel: t,
    findUserByEmail: async (email) => t.users.find((u) => u.email === email) ?? null,
    hitungMilikAkun: async ({ userId, mahasiswaId }) => {
      panggilan.hitung.push({ userId, mahasiswaId });
      return dimiliki(mahasiswaId, userId);
    },
    hapusAkun: async ({ userId, mahasiswaId }) => {
      panggilan.hapus.push({ userId, mahasiswaId });
      const dihapus = dimiliki(mahasiswaId, userId);
      t.pilihan = t.pilihan.filter((x) => x.m !== mahasiswaId);
      t.hasil_cga_detail = t.hasil_cga_detail.filter((x) => x.m !== mahasiswaId);
      t.hasil_topsis = t.hasil_topsis.filter((x) => x.m !== mahasiswaId);
      t.hasil_cga = t.hasil_cga.filter((x) => x.m !== mahasiswaId);
      t.hasil_rekomendasi = t.hasil_rekomendasi.filter((x) => x.m !== mahasiswaId);
      t.kompetensi_mahasiswa = t.kompetensi_mahasiswa.filter((x) => x.m !== mahasiswaId);
      t.sesi = t.sesi.filter((x) => x.u !== userId);
      t.users = t.users.filter((x) => x.user_id !== userId);
      return dihapus;
    },
  };
  return repository;
}

// --- the command line

test('bacaArgumen: the email and the --ya flag, in either order', () => {
  assert.deepEqual(bacaArgumen(['resp@example.invalid', '--ya']), { email: 'resp@example.invalid', ya: true });
  assert.deepEqual(bacaArgumen(['--ya', 'resp@example.invalid']), { email: 'resp@example.invalid', ya: true });
  assert.deepEqual(bacaArgumen(['resp@example.invalid']), { email: 'resp@example.invalid', ya: false });
});

test('bacaArgumen: a typo of the flag is never read as consent; no email and two emails are refused', () => {
  for (const salah of [['a@b.co', '--yes'], ['a@b.co', '-y'], ['a@b.co', '--YA'], ['a@b.co', '--ya=1'], ['a@b.co', '--force']]) {
    assert.throws(() => bacaArgumen(salah), (e) => e instanceof HapusAkunError && /Opsi tidak dikenal/.test(e.message), salah.join(' '));
  }
  assert.throws(() => bacaArgumen([]), (e) => e instanceof HapusAkunError && /Tulis email/.test(e.message));
  assert.throws(() => bacaArgumen(['--ya']), (e) => e instanceof HapusAkunError && /Tulis email/.test(e.message));
  assert.throws(() => bacaArgumen(['a@b.co', 'c@d.co', '--ya']), (e) => e instanceof HapusAkunError && /Satu akun saja/.test(e.message));
});

// --- without --ya: only a report

test('without --ya it reports the rows per table and deletes nothing', async () => {
  const repository = buatDb();
  const hasil = await hapusAkunMahasiswa({ email: 'resp-a@example.invalid', repository });
  assert.equal(hasil.dihapus, null);
  assert.deepEqual(hasil.akun, { email: 'resp-a@example.invalid', nama: 'Responden A', nim: '230211060001' });
  assert.deepEqual(hasil.rencana, {
    users: 1, mahasiswa: 1, sesi: 2, kompetensi_mahasiswa: 21, hasil_rekomendasi: 1,
    hasil_cga: 15, hasil_cga_detail: 60, hasil_topsis: 15, pilihan: 1,
  });
  assert.equal(repository.panggilan.hapus.length, 0);
  assert.equal(repository.tabel.users.length, 4); // everything is still there
  assert.equal(repository.tabel.hasil_cga.length, 30);
});

test('only the boolean true deletes: "true", 1 and undefined do not', async () => {
  for (const ya of [undefined, false, 'true', 'ya', 1, null]) {
    const repository = buatDb();
    const hasil = await hapusAkunMahasiswa({ email: 'resp-a@example.invalid', ya, repository });
    assert.equal(hasil.dihapus, null, JSON.stringify(ya));
    assert.equal(repository.panggilan.hapus.length, 0);
  }
});

// --- with --ya: deletes the account and everything it owns, nothing else

test('with --ya it deletes the account and everything it owns, in one repository call, and the rows removed match the report', async () => {
  const repository = buatDb();
  const hasil = await hapusAkunMahasiswa({ email: '  RESP-A@Example.invalid ', ya: true, repository });
  assert.equal(repository.panggilan.hapus.length, 1);
  assert.deepEqual(repository.panggilan.hapus[0], { userId: 3, mahasiswaId: 30 });
  assert.deepEqual(hasil.dihapus, hasil.rencana); // what was shown is what was removed
  assert.equal(hasil.dihapus.hasil_cga, 15);
  assert.equal(hasil.dihapus.hasil_cga_detail, 60);
  assert.equal(hasil.dihapus.hasil_topsis, 15);
  assert.equal(hasil.dihapus.pilihan, 1);
  assert.equal(hasil.dihapus.sesi, 2);
});

test('other accounts are not touched: the other respondent, the CONTOH sample and the administrator keep every row', async () => {
  const repository = buatDb();
  await hapusAkunMahasiswa({ email: 'resp-a@example.invalid', ya: true, repository });
  const t = repository.tabel;
  assert.deepEqual(t.users.map((u) => u.email).sort(), ['admin@example.invalid', 'contoh-web-manado@example.invalid', 'resp-b@example.invalid']);
  assert.equal(t.sesi.length, 2); // resp-b and the administrator
  assert.equal(t.kompetensi_mahasiswa.length, 42);
  assert.equal(t.hasil_rekomendasi.length, 1);
  assert.equal(t.hasil_cga.length, 15);
  assert.equal(t.hasil_cga_detail.length, 45);
  assert.equal(t.hasil_topsis.length, 15);
  assert.equal(t.pilihan.length, 1);
  assert.ok(t.hasil_cga.every((x) => x.m === 40));
  // a second run finds nothing to delete
  await assert.rejects(() => hapusAkunMahasiswa({ email: 'resp-a@example.invalid', ya: true, repository }), (e) => e instanceof HapusAkunError && /Tidak ada akun/.test(e.message));
});

// --- refusals

test('an administrator account is refused, with or without --ya, and nothing is read or deleted', async () => {
  for (const ya of [false, true]) {
    const repository = buatDb();
    await assert.rejects(() => hapusAkunMahasiswa({ email: 'admin@example.invalid', ya, repository }), (e) => e instanceof HapusAkunError && /hanya untuk akun mahasiswa/i.test(e.message));
    assert.equal(repository.panggilan.hitung.length + repository.panggilan.hapus.length, 0);
    assert.equal(repository.tabel.users.length, 4);
  }
});

test('the CONTOH accounts of the seed are refused, also by their NIM, and nothing is deleted', async () => {
  for (const email of EMAIL_AKUN_CONTOH) {
    const repository = buatDb();
    repository.tabel.users.push({ user_id: 9, email: 'contoh-admin@example.invalid', role: { nama_role: 'mahasiswa' }, mahasiswa: { mahasiswa_id: 90, nama: 'X', nim: '12345678' } });
    await assert.rejects(() => hapusAkunMahasiswa({ email: email.toUpperCase(), ya: true, repository }), (e) => e instanceof HapusAkunError, email);
    assert.equal(repository.panggilan.hapus.length, 0, email);
  }
  const repository = buatDb();
  await assert.rejects(() => hapusAkunMahasiswa({ email: 'contoh-web-manado@example.invalid', ya: true, repository }), (e) => /CONTOH/.test(e.message));
  // a different email but the sample NIM is refused too
  repository.tabel.users.push({ user_id: 8, email: 'lain@example.invalid', role: { nama_role: 'mahasiswa' }, mahasiswa: { mahasiswa_id: 80, nama: 'Y', nim: `${AWALAN_NIM_CONTOH}0002` } });
  await assert.rejects(() => hapusAkunMahasiswa({ email: 'lain@example.invalid', ya: true, repository }), (e) => /CONTOH/.test(e.message));
  assert.equal(repository.panggilan.hapus.length, 0);
});

test('an unknown email, an empty email and an account without mahasiswa data are refused', async () => {
  const repository = buatDb();
  await assert.rejects(() => hapusAkunMahasiswa({ email: 'tidak-ada@example.invalid', ya: true, repository }), (e) => e instanceof HapusAkunError && /Tidak ada akun/.test(e.message));
  for (const kosong of [undefined, '', '   ']) {
    await assert.rejects(() => hapusAkunMahasiswa({ email: kosong, ya: true, repository }), (e) => e instanceof HapusAkunError && /Tulis email/.test(e.message));
  }
  repository.tabel.users.push({ user_id: 7, email: 'tanpa-mhs@example.invalid', role: { nama_role: 'mahasiswa' }, mahasiswa: null });
  await assert.rejects(() => hapusAkunMahasiswa({ email: 'tanpa-mhs@example.invalid', ya: true, repository }), (e) => e instanceof HapusAkunError && /tidak punya data mahasiswa/.test(e.message));
  assert.equal(repository.panggilan.hapus.length, 0);
});

test('the seed still creates exactly the accounts the script protects', () => {
  const seed = readFileSync(new URL('../prisma/seed.js', import.meta.url), 'utf8');
  for (const email of EMAIL_AKUN_CONTOH) assert.ok(seed.includes(`'${email}'`), `${email} must be in prisma/seed.js`);
  assert.ok(seed.includes(`nim: '${AWALAN_NIM_CONTOH}`), 'the seed NIM must start with the protected prefix');
});

// --- the real repository code, on a recording fake of Prisma

function prismaPerekam() {
  const log = [];
  let dalamTransaksi = false;
  const tabelModel = (nama, jumlah = 3) => ({
    findMany: async () => (nama === 'hasilCga' ? [{ cga_id: 1 }, { cga_id: 2 }] : []),
    count: async () => jumlah,
    deleteMany: async (arg) => {
      log.push({ nama, aksi: 'deleteMany', dalamTransaksi, where: arg.where });
      return { count: jumlah };
    },
  });
  const model = Object.fromEntries(['pilihan', 'hasilCgaDetail', 'hasilTopsis', 'hasilCga', 'hasilRekomendasi', 'kompetensiMahasiswa', 'mahasiswa', 'sesi', 'user'].map((n) => [n, tabelModel(n)]));
  const prisma = {
    ...model,
    log,
    $transaction: async (fn) => {
      dalamTransaksi = true;
      try {
        return await fn(prisma);
      } finally {
        dalamTransaksi = false;
      }
    },
  };
  return prisma;
}

test('hapusAkun runs every delete inside ONE transaction, children before parents', async () => {
  const prisma = prismaPerekam();
  const hasil = await createHapusAkunRepository(prisma).hapusAkun({ userId: 3, mahasiswaId: 30 });
  assert.deepEqual(prisma.log.map((l) => l.nama), ['pilihan', 'hasilCgaDetail', 'hasilTopsis', 'hasilCga', 'hasilRekomendasi', 'kompetensiMahasiswa', 'mahasiswa', 'sesi', 'user']);
  assert.ok(prisma.log.every((l) => l.dalamTransaksi), 'every delete must happen inside the transaction');
  assert.deepEqual(Object.keys(hasil).sort(), [...URUTAN_TABEL].sort());
  // the deletes are scoped to this account only
  assert.deepEqual(prisma.log.find((l) => l.nama === 'pilihan').where, { mahasiswa_id: 30 });
  assert.deepEqual(prisma.log.find((l) => l.nama === 'user').where, { user_id: 3 });
  assert.deepEqual(prisma.log.find((l) => l.nama === 'hasilCgaDetail').where, { cga_id: { in: [1, 2] } });
});

test('hitungMilikAkun only reads: it counts all nine tables and deletes nothing', async () => {
  const prisma = prismaPerekam();
  const jumlah = await createHapusAkunRepository(prisma).hitungMilikAkun({ userId: 3, mahasiswaId: 30 });
  assert.equal(prisma.log.length, 0);
  assert.deepEqual(Object.keys(jumlah).sort(), [...URUTAN_TABEL].sort());
  assert.equal(jumlah.users, 1);
  assert.equal(jumlah.mahasiswa, 1);
  assert.equal(jumlah.hasil_cga, 2); // from the two cga_id the fake returns
});

test('the script and the package: --ya is the only way to delete, the script prints through stdout and has no file writes', () => {
  const skrip = readFileSync(new URL('../scripts/hapus-akun.js', import.meta.url), 'utf8');
  assert.match(skrip, /--ya/);
  assert.match(skrip, /process\.stdout\.write/);
  assert.doesNotMatch(skrip, /writeFile|appendFile|createWriteStream|console\.log/);
  assert.match(skrip, /console\.error\(err instanceof HapusAkunError \? err\.message/);
  const paket = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(paket.scripts['hapus-akun'], 'node scripts/hapus-akun.js');
});
