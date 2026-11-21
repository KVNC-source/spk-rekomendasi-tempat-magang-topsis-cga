/**
 * Data Layer for the administrator's delete-account script (hapus-akun): counts what an account
 * owns, and deletes all of it in ONE transaction. The only place that talks to Prisma for it.
 *
 * What a mahasiswa account owns, children first (the foreign keys decide the order):
 *   pilihan, hasil_cga_detail, hasil_topsis, hasil_cga, hasil_rekomendasi,
 *   kompetensi_mahasiswa, mahasiswa, sesi, users
 */
const TABEL = ['users', 'mahasiswa', 'sesi', 'kompetensi_mahasiswa', 'hasil_rekomendasi', 'hasil_cga', 'hasil_cga_detail', 'hasil_topsis', 'pilihan'];

export const URUTAN_TABEL = Object.freeze(TABEL);

export function createHapusAkunRepository(prisma) {
  /** The cga_id of every hasil_cga row of the mahasiswa. */
  const cgaIds = async (db, mahasiswaId) =>
    (await db.hasilCga.findMany({ where: { mahasiswa_id: mahasiswaId }, select: { cga_id: true } })).map((c) => c.cga_id);

  return {
    /** Rows per table that deleting this account would remove. Reads only; deletes nothing. */
    async hitungMilikAkun({ userId, mahasiswaId }) {
      const ids = await cgaIds(prisma, mahasiswaId);
      const [sesi, kompetensi, hasilRekomendasi, detail, topsis, pilihan] = await Promise.all([
        prisma.sesi.count({ where: { user_id: userId } }),
        prisma.kompetensiMahasiswa.count({ where: { mahasiswa_id: mahasiswaId } }),
        prisma.hasilRekomendasi.count({ where: { mahasiswa_id: mahasiswaId } }),
        prisma.hasilCgaDetail.count({ where: { cga_id: { in: ids } } }),
        prisma.hasilTopsis.count({ where: { cga_id: { in: ids } } }),
        prisma.pilihan.count({ where: { mahasiswa_id: mahasiswaId } }),
      ]);
      return {
        users: 1,
        mahasiswa: 1,
        sesi,
        kompetensi_mahasiswa: kompetensi,
        hasil_rekomendasi: hasilRekomendasi,
        hasil_cga: ids.length,
        hasil_cga_detail: detail,
        hasil_topsis: topsis,
        pilihan,
      };
    },

    /** Deletes the account and everything it owns in ONE transaction: all of it, or nothing. Returns the rows removed per table. */
    hapusAkun({ userId, mahasiswaId }) {
      return prisma.$transaction(async (tx) => {
        const ids = await cgaIds(tx, mahasiswaId);
        const pilihan = await tx.pilihan.deleteMany({ where: { mahasiswa_id: mahasiswaId } });
        const detail = await tx.hasilCgaDetail.deleteMany({ where: { cga_id: { in: ids } } });
        const topsis = await tx.hasilTopsis.deleteMany({ where: { cga_id: { in: ids } } });
        const cga = await tx.hasilCga.deleteMany({ where: { cga_id: { in: ids } } });
        const hasilRekomendasi = await tx.hasilRekomendasi.deleteMany({ where: { mahasiswa_id: mahasiswaId } });
        const kompetensi = await tx.kompetensiMahasiswa.deleteMany({ where: { mahasiswa_id: mahasiswaId } });
        const mahasiswa = await tx.mahasiswa.deleteMany({ where: { mahasiswa_id: mahasiswaId } });
        const sesi = await tx.sesi.deleteMany({ where: { user_id: userId } });
        const users = await tx.user.deleteMany({ where: { user_id: userId } });
        return {
          users: users.count,
          mahasiswa: mahasiswa.count,
          sesi: sesi.count,
          kompetensi_mahasiswa: kompetensi.count,
          hasil_rekomendasi: hasilRekomendasi.count,
          hasil_cga: cga.count,
          hasil_cga_detail: detail.count,
          hasil_topsis: topsis.count,
          pilihan: pilihan.count,
        };
      });
    },
  };
}
