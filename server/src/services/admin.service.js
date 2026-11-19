/** Business Logic Layer — administrator. The first (and for now only) endpoint is read-only. */
export function createAdminService({ repository }) {
  return {
    /** The TOPSIS criteria and their (provisional) weights from kriteria_topsis. */
    async daftarKriteria() {
      const rows = await repository.findKriteria();
      return rows.map((r) => ({
        kode_kriteria: r.kode_kriteria,
        nama_kriteria: r.nama_kriteria,
        bobot: Number(r.bobot),
        tipe: r.tipe,
      }));
    },
  };
}
