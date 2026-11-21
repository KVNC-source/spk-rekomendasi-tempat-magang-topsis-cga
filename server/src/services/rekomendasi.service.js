/**
 * Business Logic Layer — Mesin Pencocokan wrapper.
 *
 * Pipeline: database → dataset shape (services/dataset.js) → recommend() of
 * spk-engine 0.3.0 (CGA per lowongan → C1 → TOPSIS → ranking). The formulas
 * live in the engine (src/engine, never edited here). This service only reads
 * the database, builds the profile, calls the engine, persists the result and
 * returns the engine's output in the shape the client contract expects
 * (client/src/api/rekomendasi.js).
 */
import { recommend } from '../engine/src/matrix.js';
import { REQUIRED_CRITERIA_CODES } from '../config/scoring.js';
import { HttpError } from '../lib/httpError.js';
import { ringkasKesenjangan } from '../lib/ringkasanKesenjangan.js';
import { hitungSkorPengalaman } from '../lib/skorPengalaman.js';
import { ambilKonfigEngine, sidikData, sidikProfil } from '../lib/sidikJari.js';
import { bacaDataset } from './dataset.js';
import { dataProfilKurang } from './profil.service.js';

const ENGINE_COMPETENCY_SCALE = 4;

const num = (value) => Number(value);

/** Validate kriteria_topsis and convert it to the engine's criteria array. */
export function buatKriteriaEngine(rows) {
  const byCode = new Map(rows.map((r) => [r.kode_kriteria, r]));
  const missing = REQUIRED_CRITERIA_CODES.filter((code) => !byCode.has(code));
  if (missing.length > 0) {
    throw new HttpError(500, `kriteria_topsis belum lengkap, kriteria hilang: ${missing.join(', ')}`);
  }
  return REQUIRED_CRITERIA_CODES.map((code) => {
    const row = byCode.get(code);
    if (row.tipe !== 'benefit' && row.tipe !== 'cost') {
      throw new HttpError(500, `kriteria_topsis ${code}: tipe harus 'benefit' atau 'cost', ditemukan '${row.tipe}'`);
    }
    return { code, label: row.nama_kriteria, weight: num(row.bobot), type: row.tipe };
  });
}

/** Mahasiswa row → the engine's profile shape (engine/src/matrix.js header). */
export function ubahKeProfilEngine(mahasiswa) {
  return {
    id: `M${mahasiswa.mahasiswa_id}`,
    ipk: num(mahasiswa.ipk),
    minatBidang: mahasiswa.minat_bidang,
    domisili: { lat: num(mahasiswa.domisili_latitude), lon: num(mahasiswa.domisili_longitude) },
    // C7 from the two counts in the profile, by the one provisional formula (lib/skorPengalaman.js).
    skorPengalamanSertifikasi: hitungSkorPengalaman(mahasiswa.jumlah_proyek, mahasiswa.jumlah_sertifikasi),
    kompetensi: Object.fromEntries(
      mahasiswa.kompetensi_mahasiswa.map((km) => [km.kompetensi.kode_kompetensi, km.level_penguasaan])
    ),
  };
}

/**
 * @param {object} deps
 * @param {object} deps.repository
 * @param {() => Date} [deps.now]
 * @param {() => object} [deps.getKonfigEngine]  the engine settings that go into the data fingerprint
 */
export function createRekomendasiService({ repository, now = () => new Date(), getKonfigEngine = ambilKonfigEngine }) {
  async function hitungRekomendasi(mahasiswaId) {
    const mahasiswa = await repository.findMahasiswa(mahasiswaId);
    if (!mahasiswa) throw new HttpError(404, `Mahasiswa ${mahasiswaId} tidak ditemukan`);

    const { dataset, tempatIdByKode, kompetensiIdByKode, kompetensiRows, tempatRows } = await bacaDataset(repository);

    // The data fields must be filled. A kompetensi the mahasiswa has not answered (for
    // example one the Administrator added later) does NOT block the calculation: the
    // engine counts it as level 0 "Belum punya" (engine/src/matrix.js: a missing key = 0).
    const dataKurang = dataProfilKurang(mahasiswa);
    if (dataKurang.length > 0) {
      throw new HttpError(422, 'Profil belum lengkap.', { belum_diisi: [], data_kurang: dataKurang });
    }

    const kriteriaRows = await repository.findKriteria();
    const kriteria = buatKriteriaEngine(kriteriaRows);
    const profil = ubahKeProfilEngine(mahasiswa);

    let hasil;
    try {
      hasil = recommend(profil, dataset, { criteria: kriteria });
    } catch (err) {
      // The engine throws RangeError for input it will not guess about (unknown bidang, weights not summing to 1, ...).
      if (err instanceof RangeError) throw new HttpError(422, err.message);
      throw err;
    }

    const infoTempat = new Map(dataset.tempat.map((t) => [t.tempatId, t]));
    const excluded = hasil.excluded.map((e) => ({
      ...e,
      namaPerusahaan: infoTempat.get(e.tempatId)?.namaPerusahaan,
      posisi: infoTempat.get(e.tempatId)?.posisi,
    }));

    if (hasil.ranking.length === 0) {
      throw new HttpError(422, 'Tidak ada tempat magang yang dapat dihitung', { excluded });
    }

    // Notes for the developer / Bab IV (the client never shows `warnings` to the mahasiswa).
    const warnings = [...hasil.warnings];
    warnings.push(
      'C7 (Pengalaman & Sertifikasi) memakai rumus sementara (jumlah proyek × bobot + jumlah sertifikasi × bobot, bobot 1 dan 1; lib/skorPengalaman.js) dan bernilai sama untuk semua lowongan, sehingga C7 tidak memengaruhi urutan.',
      'Bobot kriteria (kriteria_topsis) bersifat sementara, menunggu validasi Koorprodi.',
      'NCF/NSF (0.6/0.4) dan nilai C2 bersumber dari engine 0.3.0 (cga.js, config.js; sementara, menunggu persetujuan dosen); tabel pemetaan_bidang belum dipakai.'
    );
    for (const k of kompetensiRows) {
      if (k.skala_maksimum !== ENGINE_COMPETENCY_SCALE) {
        warnings.push(
          `Kompetensi ${k.kode_kompetensi} memiliki skala_maksimum ${k.skala_maksimum}, sedangkan engine CGA mengasumsikan skala 0-${ENGINE_COMPETENCY_SCALE}.`
        );
      }
    }

    const hasilAkhir = {
      ...hasil,
      excluded,
      warnings,
      dihitungPada: now().toISOString(),
      profilDiperbaruiPada: new Date(mahasiswa.diperbarui_pada).toISOString(),
    };

    // hasil_cga / hasil_topsis (one row per lowongan) AND the whole result for GET /terakhir,
    // in one transaction. The fingerprints record exactly what this result was computed from.
    await repository.simpanHasil(
      mahasiswa.mahasiswa_id,
      hasil.ranking.map((r) => ({
        tempatId: tempatIdByKode.get(r.id),
        compatibilityScore: r.cga.compatibilityScore,
        detail: r.cga.perElement.map((e) => ({
          kompetensi_id: kompetensiIdByKode.get(e.id),
          level_mahasiswa: e.levelMahasiswa,
          level_minimum: e.levelKebutuhan,
          gap: e.gap,
          nilai_bobot: e.weightScore,
          is_mandatory: e.isMandatory,
        })),
        nilaiPreferensi: r.ci,
        ranking: r.rank,
      })),
      {
        // The JSON round trip drops undefined values, exactly as the HTTP response does.
        hasil: JSON.parse(JSON.stringify(hasilAkhir)),
        dihitungPada: hasilAkhir.dihitungPada,
        profilDiperbaruiPada: hasilAkhir.profilDiperbaruiPada,
        sidikProfil: sidikProfil(mahasiswa, kompetensiRows),
        sidikData: sidikData({ tempatRows, kompetensiRows, kriteriaRows }, getKonfigEngine()),
      }
    );

    // ringkasanKesenjangan is computed from the ranking in every response, never stored (it is only a
    // description of the result), so POST and GET /terakhir always have the same shape.
    return { ...hasilAkhir, ringkasanKesenjangan: ringkasKesenjangan(hasilAkhir.ranking), basi: false, penyebabBasi: [] };
  }

  /**
   * The mahasiswa's latest result, exactly as POST returned it, plus whether it is stale.
   * Stale = the fingerprints recorded at calculation time differ from today's:
   *   "profil"  the mahasiswa's profile changed
   *   "data"    the kriteria weights, a tempat magang, a kebutuhan kompetensi, a kompetensi name
   *             or the engine configuration (C2 table, C5/C6 fallback, remote pattern, version) changed
   * 404 when this mahasiswa has not calculated yet.
   */
  async function ambilTerakhir(mahasiswaId) {
    const tersimpan = await repository.findHasilTerakhir(mahasiswaId);
    if (!tersimpan) throw new HttpError(404, 'Belum ada hasil rekomendasi. Hitung dulu dari halaman Rekomendasi.');

    const [mahasiswa, kompetensiRows, tempatRows, kriteriaRows] = await Promise.all([
      repository.findMahasiswa(mahasiswaId),
      repository.findKompetensi(),
      repository.findTempatDenganKebutuhan(),
      repository.findKriteria(),
    ]);
    if (!mahasiswa) throw new HttpError(404, `Mahasiswa ${mahasiswaId} tidak ditemukan`);

    const penyebabBasi = [];
    if (tersimpan.sidik_profil !== sidikProfil(mahasiswa, kompetensiRows)) penyebabBasi.push('profil');
    if (tersimpan.sidik_data !== sidikData({ tempatRows, kompetensiRows, kriteriaRows }, getKonfigEngine())) {
      penyebabBasi.push('data');
    }
    return {
      ...tersimpan.hasil,
      ringkasanKesenjangan: ringkasKesenjangan(tersimpan.hasil.ranking),
      basi: penyebabBasi.length > 0,
      penyebabBasi,
    };
  }

  return { hitungRekomendasi, ambilTerakhir };
}
