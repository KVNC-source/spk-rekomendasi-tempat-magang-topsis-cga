/**
 * Data Layer for the recommendation pipeline: the only place that talks to
 * Prisma. The service depends on this shape, not on Prisma directly.
 */
export function createRekomendasiRepository(prisma) {
  return {
    findMahasiswa(mahasiswaId) {
      return prisma.mahasiswa.findUnique({
        where: { mahasiswa_id: mahasiswaId },
        include: {
          kompetensi_mahasiswa: { include: { kompetensi: { select: { kode_kompetensi: true } } } },
        },
      });
    },

    /** The kompetensi master table: the only source of names, kategori and deskripsi. */
    findKompetensi() {
      return prisma.kompetensi.findMany({ orderBy: { kode_kompetensi: 'asc' } });
    },

    findKriteria() {
      return prisma.kriteriaTopsis.findMany({ orderBy: { kode_kriteria: 'asc' } });
    },

    /** Every lowongan (including 'Dikeluarkan' ones; the engine decides who is excluded) with its requirements. */
    findTempatDenganKebutuhan() {
      return prisma.tempatMagang.findMany({
        orderBy: { tempat_id: 'asc' },
        include: {
          kebutuhan_kompetensi: {
            orderBy: { kompetensi_id: 'asc' },
            include: { kompetensi: { select: { kode_kompetensi: true } } },
          },
        },
      });
    },

    /**
     * Persist hasil_cga (+ hasil_cga_detail) and hasil_topsis for every ranked
     * alternative in ONE transaction, so a partial run is never stored.
     *
     * Also replaces this mahasiswa's row in hasil_rekomendasi (the whole latest result
     * plus the fingerprints it was computed from) in the same transaction.
     *
     * @param {number} mahasiswaId
     * @param {Array<{tempatId: number, compatibilityScore: number, detail: object[],
     *   nilaiPreferensi: number, ranking: number}>} items
     * @param {{hasil: object, dihitungPada: string, profilDiperbaruiPada: string,
     *   sidikProfil: string, sidikData: string}} snapshot
     * @returns {Promise<Array<{tempatId: number, cgaId: number, topsisId: number}>>}
     */
    simpanHasil(mahasiswaId, items, snapshot) {
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
        const kolom = {
          hasil: snapshot.hasil,
          dihitung_pada: new Date(snapshot.dihitungPada),
          profil_diperbarui_pada: new Date(snapshot.profilDiperbaruiPada),
          sidik_profil: snapshot.sidikProfil,
          sidik_data: snapshot.sidikData,
        };
        await tx.hasilRekomendasi.upsert({
          where: { mahasiswa_id: mahasiswaId },
          create: { mahasiswa_id: mahasiswaId, ...kolom },
          update: kolom,
        });
        return saved;
      });
    },

    /** The latest stored result of this mahasiswa, or null when none was calculated yet. */
    findHasilTerakhir(mahasiswaId) {
      return prisma.hasilRekomendasi.findUnique({ where: { mahasiswa_id: mahasiswaId } });
    },
  };
}
