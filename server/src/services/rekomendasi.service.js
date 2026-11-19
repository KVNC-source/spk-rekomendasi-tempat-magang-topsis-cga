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
import { REQUIRED_CRITERIA_CODES, getScoringConfig } from '../config/scoring.js';
import { HttpError } from '../lib/httpError.js';
import { bacaDataset } from './dataset.js';

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
export function ubahKeProfilEngine(mahasiswa, config) {
  return {
    id: `M${mahasiswa.mahasiswa_id}`,
    ipk: num(mahasiswa.ipk),
    minatBidang: mahasiswa.minat_bidang,
    domisili: { lat: num(mahasiswa.domisili_latitude), lon: num(mahasiswa.domisili_longitude) },
    // C7 is still a constant (C7_PLACEHOLDER): there is no source for it yet.
    skorPengalamanSertifikasi: config.c7Placeholder,
    kompetensi: Object.fromEntries(
      mahasiswa.kompetensi_mahasiswa.map((km) => [km.kompetensi.kode_kompetensi, km.level_penguasaan])
    ),
  };
}

export function createRekomendasiService({ repository, getConfig = getScoringConfig, now = () => new Date() }) {
  async function hitungRekomendasi(mahasiswaId) {
    const config = getConfig();

    const mahasiswa = await repository.findMahasiswa(mahasiswaId);
    if (!mahasiswa) throw new HttpError(404, `Mahasiswa ${mahasiswaId} tidak ditemukan`);

    const { dataset, tempatIdByKode, kompetensiIdByKode, kompetensiRows } = await bacaDataset(repository);

    // The data fields must be filled. A kompetensi the mahasiswa has not answered (for
    // example one the Administrator added later) does NOT block the calculation: the
    // engine counts it as level 0 "Belum punya" (engine/src/matrix.js: a missing key = 0).
    const dataKurang = [
      mahasiswa.ipk == null && 'ipk',
      !mahasiswa.minat_bidang && 'minat_bidang',
      (mahasiswa.domisili_latitude == null || mahasiswa.domisili_longitude == null) && 'domisili',
    ].filter(Boolean);
    if (dataKurang.length > 0) {
      throw new HttpError(422, 'Profil belum lengkap.', { belum_diisi: [], data_kurang: dataKurang });
    }

    const kriteria = buatKriteriaEngine(await repository.findKriteria());
    const profil = ubahKeProfilEngine(mahasiswa, config);

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
      }))
    );

    // Notes for the developer / Bab IV (the client never shows `warnings` to the mahasiswa).
    const warnings = [...hasil.warnings];
    warnings.push(
      `C7 (Pengalaman & Sertifikasi) memakai konstanta C7_PLACEHOLDER=${config.c7Placeholder}: belum ada sumber data, sehingga C7 tidak memengaruhi urutan.`,
      'Bobot kriteria (kriteria_topsis) bersifat sementara, menunggu validasi Koorprodi.',
      'NCF/NSF (0.6/0.4) dan nilai C2 bersumber dari engine 0.3.0 (cga.js, config.js; sementara, menunggu persetujuan dosen); tabel pemetaan_bidang dan CGA_NCF/CGA_NSF belum dipakai.'
    );
    for (const k of kompetensiRows) {
      if (k.skala_maksimum !== ENGINE_COMPETENCY_SCALE) {
        warnings.push(
          `Kompetensi ${k.kode_kompetensi} memiliki skala_maksimum ${k.skala_maksimum}, sedangkan engine CGA mengasumsikan skala 0-${ENGINE_COMPETENCY_SCALE}.`
        );
      }
    }

    return {
      ...hasil,
      excluded,
      warnings,
      dihitungPada: now().toISOString(),
      profilDiperbaruiPada: new Date(mahasiswa.diperbarui_pada).toISOString(),
    };
  }

  return { hitungRekomendasi };
}
