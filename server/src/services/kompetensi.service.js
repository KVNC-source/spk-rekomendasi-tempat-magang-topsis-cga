/**
 * The kompetensi list for the profile form (any signed-in user). It reads the
 * kompetensi table on every call, so a kompetensi the Administrator adds shows
 * up in the mahasiswa's form straight away. The table is the only source of
 * names, kategori and deskripsi.
 */
export function createKompetensiService({ repository }) {
  return {
    /** Shape of GET /api/kompetensi in client/src/api/profil.js; kompetensi_id is the public code ("K01"). */
    async daftar() {
      const rows = await repository.findKompetensi();
      return rows
        .sort((a, b) => Number(a.kode_kompetensi.slice(1)) - Number(b.kode_kompetensi.slice(1)))
        .map((k) => ({
          kompetensi_id: k.kode_kompetensi,
          nama_kompetensi: k.nama_kompetensi,
          kategori: k.kategori,
          deskripsi: k.deskripsi ?? null,
          skala_maksimum: k.skala_maksimum,
        }));
    },
  };
}
