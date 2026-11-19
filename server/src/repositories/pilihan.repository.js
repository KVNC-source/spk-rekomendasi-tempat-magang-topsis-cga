/**
 * Data Layer for pilihan: the one tempat magang a mahasiswa has chosen.
 * Only place that talks to Prisma for this feature.
 */
export function createPilihanRepository(prisma) {
  return {
    findMahasiswa(mahasiswaId) {
      return prisma.mahasiswa.findUnique({ where: { mahasiswa_id: mahasiswaId }, select: { mahasiswa_id: true } });
    },

    findTempatByKode(kodeTempat) {
      return prisma.tempatMagang.findUnique({ where: { kode_tempat: kodeTempat } });
    },

    /** The hasil_topsis row with the mahasiswa and tempat of its hasil_cga, to check it belongs to this choice. */
    findHasilTopsis(topsisId) {
      return prisma.hasilTopsis.findUnique({
        where: { topsis_id: topsisId },
        include: { hasil_cga: { select: { mahasiswa_id: true, tempat_id: true } } },
      });
    },

    findPilihan(mahasiswaId) {
      return prisma.pilihan.findUnique({ where: { mahasiswa_id: mahasiswaId }, include: { tempat_magang: true } });
    },

    /** Insert, or replace the existing choice of this mahasiswa (mahasiswa_id is unique). */
    simpanPilihan({ mahasiswaId, tempatId, topsisId }) {
      return prisma.pilihan.upsert({
        where: { mahasiswa_id: mahasiswaId },
        update: { tempat_id: tempatId, topsis_id: topsisId, dipilih_pada: new Date() },
        create: { mahasiswa_id: mahasiswaId, tempat_id: tempatId, topsis_id: topsisId },
        include: { tempat_magang: true },
      });
    },

    hapusPilihan(mahasiswaId) {
      return prisma.pilihan.deleteMany({ where: { mahasiswa_id: mahasiswaId } });
    },
  };
}
