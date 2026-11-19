/**
 * Data Layer for the administrator endpoints (kriteria, kompetensi, tempat
 * magang with its kebutuhan kompetensi). The only place that talks to Prisma for them.
 */
const sertakanTempat = {
  kebutuhan_kompetensi: {
    orderBy: { kompetensi_id: 'asc' },
    include: { kompetensi: { select: { kode_kompetensi: true, nama_kompetensi: true } } },
  },
  _count: { select: { hasil_cga: true, pilihan: true } },
};

const sertakanPemakaianKompetensi = {
  _count: { select: { kebutuhan_kompetensi: true, kompetensi_mahasiswa: true, hasil_cga_detail: true } },
};

const kebutuhanBaru = (rows) =>
  rows.map((r) => ({ kompetensi_id: r.kompetensiId, level_minimum: r.level_minimum, is_mandatory: r.wajib }));

const keTanggal = (tanggal) => (tanggal ? new Date(`${tanggal}T00:00:00Z`) : null);

/** Form fields -> tempat_magang columns. */
function kolomTempat(data) {
  return {
    nama_perusahaan: data.nama_perusahaan,
    posisi: data.posisi,
    bidang_industri: data.bidang_industri,
    lokasi: data.lokasi,
    latitude: data.latitude,
    longitude: data.longitude,
    mode_kerja: data.mode_kerja,
    benefit_finansial: data.benefit_finansial,
    reputasi: data.reputasi,
    status_alternatif: data.status_alternatif,
    alasan_dikeluarkan: data.alasan_dikeluarkan,
    sumber_url: data.sumber_url,
    tanggal_akses: keTanggal(data.tanggal_akses),
  };
}

export function createAdminRepository(prisma) {
  return {
    // --- kriteria_topsis
    findKriteria() {
      return prisma.kriteriaTopsis.findMany({ orderBy: { kode_kriteria: 'asc' } });
    },

    /** Save all weights in ONE transaction, so a half-saved set (total != 1) can never be read. */
    updateBobot(bobotPerKode) {
      return prisma.$transaction(
        Object.entries(bobotPerKode).map(([kode, bobot]) =>
          prisma.kriteriaTopsis.update({ where: { kode_kriteria: kode }, data: { bobot } })
        )
      );
    },

    // --- kompetensi
    findKompetensi() {
      return prisma.kompetensi.findMany({ include: sertakanPemakaianKompetensi });
    },
    findKompetensiByKode(kode) {
      return prisma.kompetensi.findUnique({ where: { kode_kompetensi: kode }, include: sertakanPemakaianKompetensi });
    },
    createKompetensi(data) {
      return prisma.kompetensi.create({
        data: {
          kode_kompetensi: data.kode_kompetensi,
          nama_kompetensi: data.nama_kompetensi,
          kategori: data.kategori,
          deskripsi: data.deskripsi,
          skala_maksimum: data.skala_maksimum,
        },
        include: sertakanPemakaianKompetensi,
      });
    },
    updateKompetensi(kompetensiId, data) {
      return prisma.kompetensi.update({
        where: { kompetensi_id: kompetensiId },
        // the scale (skala_maksimum) is not touched from the admin pages
        data: { nama_kompetensi: data.nama_kompetensi, kategori: data.kategori, deskripsi: data.deskripsi },
        include: sertakanPemakaianKompetensi,
      });
    },
    deleteKompetensi(kompetensiId) {
      return prisma.kompetensi.delete({ where: { kompetensi_id: kompetensiId } });
    },

    // --- tempat_magang + kebutuhan_kompetensi
    findTempatList() {
      return prisma.tempatMagang.findMany({ include: sertakanTempat });
    },
    findTempatByKode(kode) {
      return prisma.tempatMagang.findUnique({ where: { kode_tempat: kode }, include: sertakanTempat });
    },

    /** Create the tempat and its kebutuhan together (one write, all or nothing). */
    createTempat(data, kebutuhan) {
      return prisma.tempatMagang.create({
        data: { kode_tempat: data.kode_tempat, ...kolomTempat(data), kebutuhan_kompetensi: { create: kebutuhanBaru(kebutuhan) } },
        include: sertakanTempat,
      });
    },

    /** Replace the tempat fields AND its whole kebutuhan list in one transaction. */
    updateTempat(tempatId, data, kebutuhan) {
      return prisma.$transaction(async (tx) => {
        await tx.kebutuhanKompetensi.deleteMany({ where: { tempat_id: tempatId } });
        return tx.tempatMagang.update({
          where: { tempat_id: tempatId },
          data: { ...kolomTempat(data), kebutuhan_kompetensi: { create: kebutuhanBaru(kebutuhan) } },
          include: sertakanTempat,
        });
      });
    },

    deleteTempat(tempatId) {
      return prisma.$transaction(async (tx) => {
        await tx.kebutuhanKompetensi.deleteMany({ where: { tempat_id: tempatId } });
        await tx.tempatMagang.delete({ where: { tempat_id: tempatId } });
      });
    },
  };
}
