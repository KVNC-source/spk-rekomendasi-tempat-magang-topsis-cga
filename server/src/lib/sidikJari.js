/**
 * Fingerprints that tell whether a stored recommendation is still current.
 *
 * A recommendation is a function of (a) the mahasiswa's profile and (b) everything
 * else the engine reads: the kriteria weights, the tempat magang and their
 * kebutuhan kompetensi, the kompetensi names, and the engine's own configuration
 * (the C2 table, the C5/C6 fallback, the remote pattern, the engine version).
 * We hash a CANONICAL form of each: object keys sorted, lists sorted by public
 * code, Decimal values written as fixed-point strings, so the same data always
 * gives the same fingerprint and any real change gives a different one.
 *
 *   sidikProfil  -> compared with the mahasiswa's current profile
 *   sidikData    -> compared with the current reference data + engine config
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  C2_IDENTIK,
  C2_PASANGAN_SERUMPUN,
  C2_SERUMPUN,
  C2_TIDAK_RELEVAN,
  NILAI_TANPA_DATA,
  POLA_REMOTE,
} from '../engine/src/config.js';
import { hitungSkorPengalaman } from './skorPengalaman.js';

const versiEngine = JSON.parse(readFileSync(new URL('../engine/package.json', import.meta.url), 'utf8')).version;

/** Fixed-point string for a number or a Prisma Decimal; null stays null. */
export const tetap = (nilai, desimal) => (nilai === null || nilai === undefined ? null : Number(nilai).toFixed(desimal));

const tanggal = (nilai) => (nilai ? new Date(nilai).toISOString().slice(0, 10) : null);
const urutKode = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Same structure with every object's keys in sorted order, recursively. Arrays keep their order. */
export function kanonik(nilai) {
  if (Array.isArray(nilai)) return nilai.map(kanonik);
  if (nilai && typeof nilai === 'object') {
    return Object.fromEntries(
      Object.keys(nilai)
        .sort()
        .map((kunci) => [kunci, kanonik(nilai[kunci])])
    );
  }
  return nilai;
}

export const sha256 = (nilai) => createHash('sha256').update(JSON.stringify(kanonik(nilai))).digest('hex');

/** The engine settings that change a result. Tests pass a modified copy to simulate a config change. */
export function ambilKonfigEngine() {
  return {
    versi: versiEngine,
    c2: {
      identik: C2_IDENTIK,
      serumpun: C2_SERUMPUN,
      tidakRelevan: C2_TIDAK_RELEVAN,
      // each pair is symmetric, so the order inside a pair and between pairs does not matter
      pasangan: C2_PASANGAN_SERUMPUN.map((p) => [...p].sort(urutKode)).sort((a, b) => urutKode(a.join('|'), b.join('|'))),
    },
    nilaiTanpaData: { ...NILAI_TANPA_DATA },
    polaRemote: { sumber: POLA_REMOTE.source, flag: POLA_REMOTE.flags },
  };
}

/**
 * @param {object} data
 * @param {object[]} data.tempatRows      tempat_magang rows with kebutuhan_kompetensi (+ kompetensi.kode_kompetensi)
 * @param {object[]} data.kompetensiRows  kompetensi rows
 * @param {object[]} data.kriteriaRows    kriteria_topsis rows
 */
export function sidikData({ tempatRows, kompetensiRows, kriteriaRows }, konfigEngine = ambilKonfigEngine()) {
  return sha256({
    engine: konfigEngine,
    kriteria: [...kriteriaRows]
      .sort((a, b) => urutKode(a.kode_kriteria, b.kode_kriteria))
      .map((k) => ({ kode: k.kode_kriteria, nama: k.nama_kriteria, bobot: tetap(k.bobot, 4), tipe: k.tipe })),
    kompetensi: [...kompetensiRows]
      .sort((a, b) => urutKode(a.kode_kompetensi, b.kode_kompetensi))
      .map((k) => ({ kode: k.kode_kompetensi, nama: k.nama_kompetensi })),
    tempat: [...tempatRows]
      .sort((a, b) => urutKode(a.kode_tempat, b.kode_tempat))
      .map((t) => ({
        kode: t.kode_tempat,
        nama: t.nama_perusahaan,
        posisi: t.posisi,
        bidang: t.bidang_industri,
        lokasi: t.lokasi,
        modeKerja: t.mode_kerja ?? null,
        status: t.status_alternatif,
        alasanDikeluarkan: t.alasan_dikeluarkan ?? null,
        sumberUrl: t.sumber_url ?? null,
        tanggalAkses: tanggal(t.tanggal_akses),
        lat: tetap(t.latitude, 6),
        lon: tetap(t.longitude, 6),
        benefit: tetap(t.benefit_finansial, 2),
        reputasi: t.reputasi ?? null,
        kebutuhan: [...t.kebutuhan_kompetensi]
          .sort((a, b) => urutKode(a.kompetensi.kode_kompetensi, b.kompetensi.kode_kompetensi))
          .map((k) => ({
            kompetensi: k.kompetensi.kode_kompetensi,
            levelMinimum: k.level_minimum,
            wajib: Boolean(k.is_mandatory),
          })),
      })),
  });
}

/**
 * @param {object} mahasiswa        the mahasiswa row with kompetensi_mahasiswa (+ kompetensi.kode_kompetensi)
 * @param {object[]} kompetensiRows every kompetensi in the table: an unanswered one is level 0
 *                                  for the engine, so "no row" and "level 0" hash the same
 */
export function sidikProfil(mahasiswa, kompetensiRows) {
  const level = new Map(mahasiswa.kompetensi_mahasiswa.map((km) => [km.kompetensi.kode_kompetensi, km.level_penguasaan]));
  const punyaC7 = mahasiswa.jumlah_proyek != null && mahasiswa.jumlah_sertifikasi != null;
  return sha256({
    ipk: tetap(mahasiswa.ipk, 2),
    minat: mahasiswa.minat_bidang ?? null,
    lat: tetap(mahasiswa.domisili_latitude, 6),
    lon: tetap(mahasiswa.domisili_longitude, 6),
    skorC7: punyaC7 ? hitungSkorPengalaman(mahasiswa.jumlah_proyek, mahasiswa.jumlah_sertifikasi) : null,
    kompetensi: [...kompetensiRows]
      .sort((a, b) => urutKode(a.kode_kompetensi, b.kode_kompetensi))
      .map((k) => [k.kode_kompetensi, level.get(k.kode_kompetensi) ?? 0]),
  });
}
