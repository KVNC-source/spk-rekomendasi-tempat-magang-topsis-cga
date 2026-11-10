/**
 * Data Layer for the recommendation pipeline: the only place that talks to
 * Prisma. The service depends on this shape, not on Prisma directly.
 */
export function createRekomendasiRepository(prisma) {
  return {
    findMahasiswa(mahasiswaId) {
      return prisma.mahasiswa.findUnique({
        where: { mahasiswa_id: mahasiswaId },
        include: { kompetensi_mahasiswa: true },
      });
    },

    findKriteria() {
      return prisma.kriteriaTopsis.findMany({ orderBy: { kode_kriteria: 'asc' } });
    },

    findPemetaanBidang() {
      return prisma.pemetaanBidang.findMany();
    },

    findTempatDenganKebutuhan() {
      return prisma.tempatMagang.findMany({
        orderBy: { tempat_id: 'asc' },
        include: {
          kebutuhan_kompetensi: {
            orderBy: { kompetensi_id: 'asc' },
            include: { kompetensi: { select: { nama_kompetensi: true, skala_maksimum: true } } },
          },
        },
      });
    },

    /**
     * Persist hasil_cga (+ hasil_cga_detail) and hasil_topsis for every ranked
     * alternative in ONE transaction, so a partial run is never stored.
     *
     * @param {number} mahasiswaId
     * @param {Array<{tempatId: number, compatibilityScore: number, detail: object[],
     *   nilaiPreferensi: number, ranking: number}>} items
     * @returns {Promise<Array<{tempatId: number, cgaId: number, topsisId: number}>>}
     */
    simpanHasil(mahasiswaId, items) {
      return prisma.$transaction(async (tx) => {
        const saved = [];
        for (const item of items) {
          const cga = await tx.hasilCga.create({
            data: {
              mahasiswa_id: mahasiswaId,
              tempat_id: item.tempatId,
              compatibility_score: item.compatibilityScore,
              detail: { create: item.detail },
            },
          });
          const topsis = await tx.hasilTopsis.create({
            data: {
              cga_id: cga.cga_id,
              nilai_preferensi: item.nilaiPreferensi,
              ranking: item.ranking,
            },
          });
          saved.push({ tempatId: item.tempatId, cgaId: cga.cga_id, topsisId: topsis.topsis_id });
        }
        return saved;
      });
    },
  };
}
