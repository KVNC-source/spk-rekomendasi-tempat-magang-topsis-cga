/**
 * Reads the database and turns it into the shape of the engine's dataset.json
 * ({ meta, tempat, kebutuhan, kompetensi }), so recommend() runs on database
 * rows exactly as it runs on the JSON file.
 *
 * The engine knows lowongan and kompetensi only by their public codes
 * ("T01", "K01"): kode_tempat and kode_kompetensi. Numeric primary keys never
 * leave this module except through the lookup maps it returns.
 */

const num = (value) => (value === null || value === undefined ? null : Number(value));
const isoDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);

/** Pure conversion (no I/O), so it can be tested without a database. */
export function ubahKeDataset({ tempatRows, kompetensiRows }) {
  const tempatIdByKode = new Map(tempatRows.map((t) => [t.kode_tempat, t.tempat_id]));
  const kompetensiIdByKode = new Map(kompetensiRows.map((k) => [k.kode_kompetensi, k.kompetensi_id]));

  const tempat = tempatRows.map((t) => ({
    tempatId: t.kode_tempat,
    namaPerusahaan: t.nama_perusahaan,
    posisi: t.posisi,
    bidang: t.bidang_industri,
    lokasi: t.lokasi,
    modeKerja: t.mode_kerja ?? null,
    lat: num(t.latitude),
    lon: num(t.longitude),
    benefitFinansial: num(t.benefit_finansial),
    reputasi: num(t.reputasi),
    statusAlternatif: t.status_alternatif,
    alasanDikeluarkan: t.alasan_dikeluarkan ?? null,
    sumberUrl: t.sumber_url ?? null,
    tanggalAkses: isoDate(t.tanggal_akses),
  }));

  const kebutuhan = tempatRows.flatMap((t) =>
    t.kebutuhan_kompetensi.map((k) => ({
      kebutuhanId: String(k.kebutuhan_id),
      tempatId: t.kode_tempat,
      kompetensiId: k.kompetensi.kode_kompetensi,
      levelMinimum: k.level_minimum,
      jenis: k.is_mandatory ? 'wajib' : 'opsional',
    }))
  );

  // The names the engine puts on perElement / kesenjangan come from this table.
  const kompetensi = kompetensiRows.map((k) => ({ id: k.kode_kompetensi, nama: k.nama_kompetensi }));

  return {
    dataset: { meta: { sumber: 'database' }, tempat, kebutuhan, kompetensi },
    tempatIdByKode,
    kompetensiIdByKode,
  };
}

/** Reads tempat_magang, kebutuhan_kompetensi and kompetensi through the repository. */
export async function bacaDataset(repository) {
  const [tempatRows, kompetensiRows] = await Promise.all([
    repository.findTempatDenganKebutuhan(),
    repository.findKompetensi(),
  ]);
  return { ...ubahKeDataset({ tempatRows, kompetensiRows }), kompetensiRows, tempatRows };
}
