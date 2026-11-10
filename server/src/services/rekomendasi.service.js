/**
 * Business Logic Layer — Mesin Pencocokan wrapper.
 *
 * Pipeline: CGA (per tempat magang) → Compatibility Score (C1) → TOPSIS → Ranking.
 * The formulas live in the standalone engine; this service only gathers the
 * C1–C7 inputs, calls the engine, persists the result and exposes every
 * intermediate step for BAB IV.
 */
import { calculateCompatibilityScore, runTopsis } from '../../engine/spk-engine/src/index.js';
import { REQUIRED_CRITERIA_CODES, getScoringConfig } from '../config/scoring.js';
import { HttpError } from '../lib/httpError.js';
import { haversineKm } from '../lib/haversine.js';

const ENGINE_COMPETENCY_SCALE = 4;

/** Open methodological issues, always returned so they are never silent. */
const CATATAN_METODE = [
  'C3 (IPK) adalah atribut mahasiswa sehingga bernilai sama untuk semua tempat magang pada satu perhitungan; C3 tidak memengaruhi urutan ranking. Masalah terbuka, menunggu keputusan.',
  'C7 (Pengalaman & Sertifikasi) belum memiliki sumber data; setiap tempat magang diberi nilai placeholder konstan sehingga C7 tidak memengaruhi urutan ranking. Masalah terbuka, menunggu keputusan.',
  'Bobot kriteria (kriteria_topsis) dan NCF/NSF bersifat sementara, menunggu validasi Koorprodi.',
];

const num = (value) => Number(value);

const normalize = (text) => String(text).trim().toLowerCase();

/** C2: 100 if identical, partial if listed in pemetaan_bidang (serumpun), else 0. */
export function hitungKesesuaianBidang(minatBidang, bidangIndustri, pemetaan) {
  if (normalize(minatBidang) === normalize(bidangIndustri)) return 100;
  const row = pemetaan.find(
    (p) =>
      normalize(p.minat_bidang) === normalize(minatBidang) &&
      normalize(p.bidang_industri) === normalize(bidangIndustri)
  );
  return row ? num(row.nilai_kesesuaian) : 0;
}

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

export function createRekomendasiService({ repository, getConfig = getScoringConfig }) {
  /**
   * CGA + C1–C7 values for one tempat magang. Throws RangeError when the pair
   * cannot be computed; the caller records it under tidak_dapat_dihitung.
   */
  function hitungAlternatif(mahasiswa, tempat, levelByKompetensi, pemetaan, config) {
    if (tempat.latitude == null || tempat.longitude == null) {
      throw new RangeError('koordinat tempat magang belum diisi (diperlukan untuk C4)');
    }
    if (tempat.kebutuhan_kompetensi.length === 0) {
      throw new RangeError('tempat magang belum memiliki kebutuhan_kompetensi');
    }

    const comparisons = tempat.kebutuhan_kompetensi.map((k) => {
      const level = levelByKompetensi.get(k.kompetensi_id);
      return {
        id: String(k.kompetensi_id),
        levelMahasiswa: level,
        levelKebutuhan: k.level_minimum,
        isMandatory: k.is_mandatory,
        assessed: level !== undefined,
      };
    });

    const cga = calculateCompatibilityScore(comparisons, { ncf: config.ncf, nsf: config.nsf });

    const values = {
      C1: cga.compatibilityScore,
      C2: hitungKesesuaianBidang(mahasiswa.minat_bidang, tempat.bidang_industri, pemetaan),
      C3: num(mahasiswa.ipk),
      C4: haversineKm(
        num(mahasiswa.domisili_latitude),
        num(mahasiswa.domisili_longitude),
        num(tempat.latitude),
        num(tempat.longitude)
      ),
      C5: num(tempat.benefit_finansial),
      C6: num(tempat.reputasi),
      C7: config.c7Placeholder,
    };

    const perKompetensi = cga.perElement.map((el, i) => {
      const k = tempat.kebutuhan_kompetensi[i];
      return {
        kompetensi_id: k.kompetensi_id,
        nama_kompetensi: k.kompetensi.nama_kompetensi,
        level_mahasiswa: comparisons[i].assessed ? comparisons[i].levelMahasiswa : null,
        level_minimum: k.level_minimum,
        gap: el.gap,
        nilai_bobot: el.weightScore,
        is_mandatory: el.isMandatory,
      };
    });

    return { cga, values, perKompetensi };
  }

  async function hitungRekomendasi(mahasiswaId) {
    const config = getConfig();

    const mahasiswa = await repository.findMahasiswa(mahasiswaId);
    if (!mahasiswa) throw new HttpError(404, `Mahasiswa ${mahasiswaId} tidak ditemukan`);
    if (mahasiswa.domisili_latitude == null || mahasiswa.domisili_longitude == null) {
      throw new HttpError(422, 'Koordinat domisili mahasiswa belum diisi (diperlukan untuk C4)');
    }

    const kriteria = buatKriteriaEngine(await repository.findKriteria());
    const pemetaan = await repository.findPemetaanBidang();
    const tempatList = await repository.findTempatDenganKebutuhan();
    const levelByKompetensi = new Map(
      mahasiswa.kompetensi_mahasiswa.map((km) => [km.kompetensi_id, km.level_penguasaan])
    );

    const peringatan = [...CATATAN_METODE];
    const skalaDilaporkan = new Set();
    const eligible = [];
    const tidakDapatDihitung = [];

    for (const tempat of tempatList) {
      for (const k of tempat.kebutuhan_kompetensi) {
        if (k.kompetensi.skala_maksimum !== ENGINE_COMPETENCY_SCALE && !skalaDilaporkan.has(k.kompetensi_id)) {
          skalaDilaporkan.add(k.kompetensi_id);
          peringatan.push(
            `Kompetensi ${k.kompetensi_id} memiliki skala_maksimum ${k.kompetensi.skala_maksimum}, sedangkan engine CGA mengasumsikan skala 1-${ENGINE_COMPETENCY_SCALE} (Tabel 2.3).`
          );
        }
      }
      try {
        const hasil = hitungAlternatif(mahasiswa, tempat, levelByKompetensi, pemetaan, config);
        eligible.push({ tempat, ...hasil });
      } catch (err) {
        if (!(err instanceof RangeError)) throw err;
        tidakDapatDihitung.push({
          tempat_id: tempat.tempat_id,
          nama_perusahaan: tempat.nama_perusahaan,
          alasan: err.message,
        });
      }
    }

    if (eligible.length === 0) {
      throw new HttpError(422, 'Tidak ada tempat magang yang dapat dihitung', { tidak_dapat_dihitung: tidakDapatDihitung });
    }

    let topsis;
    try {
      topsis = runTopsis(
        eligible.map((e) => ({ id: String(e.tempat.tempat_id), values: e.values })),
        kriteria
      );
    } catch (err) {
      if (err instanceof RangeError) throw new HttpError(422, `Perhitungan TOPSIS gagal: ${err.message}`);
      throw err;
    }
    peringatan.push(...topsis.warnings);

    const byTempatId = new Map(eligible.map((e) => [String(e.tempat.tempat_id), e]));
    const saved = await repository.simpanHasil(
      mahasiswa.mahasiswa_id,
      topsis.ranking.map((r) => {
        const e = byTempatId.get(r.id);
        return {
          tempatId: e.tempat.tempat_id,
          compatibilityScore: e.cga.compatibilityScore,
          detail: e.perKompetensi.map((p) => ({
            kompetensi_id: p.kompetensi_id,
            level_mahasiswa: p.level_mahasiswa,
            level_minimum: p.level_minimum,
            gap: p.gap,
            nilai_bobot: p.nilai_bobot,
            is_mandatory: p.is_mandatory,
          })),
          nilaiPreferensi: r.ci,
          ranking: r.rank,
        };
      })
    );
    const idsByTempat = new Map(saved.map((s) => [s.tempatId, s]));

    return {
      mahasiswa: { mahasiswa_id: mahasiswa.mahasiswa_id, nim: mahasiswa.nim, nama: mahasiswa.nama },
      kriteria: kriteria.map((c) => ({ kode_kriteria: c.code, nama_kriteria: c.label, bobot: c.weight, tipe: c.type })),
      konfigurasi: { ncf: config.ncf, nsf: config.nsf, c7_placeholder: config.c7Placeholder },
      rekomendasi: topsis.ranking.map((r) => {
        const e = byTempatId.get(r.id);
        const ids = idsByTempat.get(e.tempat.tempat_id);
        return {
          ranking: r.rank,
          tempat_id: e.tempat.tempat_id,
          nama_perusahaan: e.tempat.nama_perusahaan,
          cga_id: ids.cgaId,
          topsis_id: ids.topsisId,
          nilai_preferensi: r.ci,
          d_plus: r.dPlus,
          d_minus: r.dMinus,
          compatibility_score: e.cga.compatibilityScore,
          nilai_kriteria: e.values,
        };
      }),
      tidak_dapat_dihitung: tidakDapatDihitung,
      peringatan,
      langkah_perhitungan: {
        cga: eligible.map((e) => ({
          tempat_id: e.tempat.tempat_id,
          nama_perusahaan: e.tempat.nama_perusahaan,
          ncf: e.cga.ncf,
          nsf: e.cga.nsf,
          avg_wajib: e.cga.avgWajib,
          avg_opsional: e.cga.avgOpsional,
          s_komp: e.cga.sKomp,
          s_maks: e.cga.sMaks,
          compatibility_score: e.cga.compatibilityScore,
          per_kompetensi: e.perKompetensi,
        })),
        topsis: {
          kriteria: topsis.steps.criteria,
          tempat_id: topsis.steps.alternativeIds.map(Number),
          matriks_keputusan: topsis.steps.decisionMatrix,
          norma_kolom: topsis.steps.columnNorms,
          matriks_ternormalisasi: topsis.steps.normalizedMatrix,
          matriks_terbobot: topsis.steps.weightedMatrix,
          solusi_ideal_positif: topsis.steps.idealPositive,
          solusi_ideal_negatif: topsis.steps.idealNegative,
          jarak: topsis.steps.distances.map((d) => ({ d_plus: d.dPlus, d_minus: d.dMinus })),
        },
      },
    };
  }

  return { hitungRekomendasi };
}
