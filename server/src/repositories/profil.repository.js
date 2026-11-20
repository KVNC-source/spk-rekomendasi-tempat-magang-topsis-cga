/**
 * Data Layer for the mahasiswa's own profile: the only place that talks to Prisma
 * for it. The service depends on this shape, not on Prisma directly.
 */
const sertakanJawaban = {
  kompetensi_mahasiswa: { include: { kompetensi: { select: { kode_kompetensi: true } } } },
};

export function createProfilRepository(prisma) {
  return {
    findMahasiswa(mahasiswaId) {
      return prisma.mahasiswa.findUnique({ where: { mahasiswa_id: mahasiswaId }, include: sertakanJawaban });
    },

    findKompetensi() {
      return prisma.kompetensi.findMany({ orderBy: { kode_kompetensi: 'asc' } });
    },

    /**
     * Replace the profile in ONE transaction: the data fields on the mahasiswa row
     * (which also moves diperbarui_pada) and the whole set of kompetensi answers.
     * Returns the saved row (with its answers), or null when the mahasiswa does not exist.
     */
    simpanProfil(mahasiswaId, { kompetensi, ...kolom }) {
      return prisma.$transaction(async (tx) => {
        const ada = await tx.mahasiswa.findUnique({ where: { mahasiswa_id: mahasiswaId }, select: { mahasiswa_id: true } });
        if (!ada) return null;
        await tx.mahasiswa.update({ where: { mahasiswa_id: mahasiswaId }, data: kolom });
        await tx.kompetensiMahasiswa.deleteMany({ where: { mahasiswa_id: mahasiswaId } });
        if (kompetensi.length > 0) {
          await tx.kompetensiMahasiswa.createMany({
            data: kompetensi.map((k) => ({ mahasiswa_id: mahasiswaId, kompetensi_id: k.kompetensi_id, level_penguasaan: k.level_penguasaan })),
          });
        }
        return tx.mahasiswa.findUnique({ where: { mahasiswa_id: mahasiswaId }, include: sertakanJawaban });
      });
    },
  };
}
