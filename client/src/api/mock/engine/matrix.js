/**
 * Decision-matrix builder — connects the dataset, one mahasiswa profile, CGA
 * and TOPSIS (pipeline in the order agreed for BAB III):
 *
 *   1. Filter alternatives: status Dipakai, not remote, coordinates present,
 *      at least one wajib competency.
 *   2. C1 per lowongan from CGA (cga.js).
 *   3. C2 from the bidang mapping (config.js), C3 and C7 from the profile,
 *      C4 haversine from the profile's domisili.
 *   4. C5/C6: missing values imputed with the median computed ONCE over all
 *      lowongan with status Dipakai (not over the filtered set, so the
 *      substitute value does not change per request). Each imputed entry is
 *      flagged.
 *   5. TOPSIS (topsis.js), then merge ranking with per-lowongan details.
 *
 * Profile shape:
 *   {
 *     id: 'P01',
 *     ipk: 3.45,                       // C3, scale 0-4
 *     minatBidang: 'Web Development',  // one of config.BIDANG
 *     domisili: { lat: 1.4748, lon: 124.8421 },
 *     skorPengalamanSertifikasi: 4,    // C7, per master-data weighting
 *     kompetensi: { K01: 3, K02: 2 }   // 0-4; a missing key = 0 (tidak dimiliki)
 *   }
 */
import { calculateCompatibilityScore } from './cga.js';
import { runTopsis, criteriaC1C7 } from './topsis.js';
import {
  BIDANG,
  C2_IDENTIK,
  C2_SERUMPUN,
  C2_TIDAK_RELEVAN,
  C2_PASANGAN_SERUMPUN,
  NILAI_TANPA_DATA,
  POLA_REMOTE,
} from './config.js';

const EARTH_RADIUS_KM = 6371;

/** Great-circle (straight-line) distance in km. §2.6.3 C4. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** C2 score for a mahasiswa minat vs a lowongan bidang. */
export function c2Score(minatBidang, bidangLowongan) {
  for (const b of [minatBidang, bidangLowongan]) {
    if (!BIDANG.includes(b)) throw new RangeError(`Unknown bidang "${b}"; add it to config.BIDANG`);
  }
  if (minatBidang === bidangLowongan) return C2_IDENTIK;
  const serumpun = C2_PASANGAN_SERUMPUN.some(
    ([a, b]) => (a === minatBidang && b === bidangLowongan) || (b === minatBidang && a === bidangLowongan)
  );
  return serumpun ? C2_SERUMPUN : C2_TIDAK_RELEVAN;
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Substitute values for C5/C6, computed once over all lowongan with status
 * Dipakai. Returns, per criterion, the value used and how many real values it
 * came from (n = 0 means NILAI_TANPA_DATA was used).
 */
export function computeImputationValues(tempatList) {
  const dipakai = tempatList.filter((t) => t.statusAlternatif === 'Dipakai');
  const result = {};
  for (const [code, field] of [['C5', 'benefitFinansial'], ['C6', 'reputasi']]) {
    const known = dipakai.map((t) => t[field]).filter((v) => typeof v === 'number');
    result[code] = known.length
      ? { nilai: median(known), n: known.length, sumber: 'median' }
      : { nilai: NILAI_TANPA_DATA[code], n: 0, sumber: 'tanpa_data' };
  }
  return result;
}

/** Step 1. Splits the dataset into usable alternatives and excluded ones with a reason. */
export function filterAlternatives(dataset) {
  const eligible = [];
  const excluded = [];
  for (const t of dataset.tempat) {
    const wajibCount = dataset.kebutuhan.filter((k) => k.tempatId === t.tempatId && k.jenis === 'wajib').length;
    let alasan = null;
    if (t.statusAlternatif !== 'Dipakai') alasan = t.alasanDikeluarkan || `status ${t.statusAlternatif}`;
    else if (t.modeKerja && POLA_REMOTE.test(t.modeKerja)) alasan = 'Remote (Batasan 3)';
    else if (typeof t.lat !== 'number' || typeof t.lon !== 'number') alasan = 'Koordinat kosong (C4 tidak bisa dihitung)';
    else if (wajibCount === 0) alasan = 'Tidak ada kompetensi wajib';
    if (alasan) excluded.push({ tempatId: t.tempatId, alasan });
    else eligible.push(t);
  }
  return { eligible, excluded };
}

/**
 * CGA input for one lowongan. If the same kompetensi appears more than once
 * for one lowongan, the highest level is used and it counts as wajib if any
 * row is wajib (rule in §3.3.1).
 */
function competenciesFor(tempatId, dataset, profil) {
  const byKomp = new Map();
  for (const k of dataset.kebutuhan.filter((x) => x.tempatId === tempatId)) {
    const prev = byKomp.get(k.kompetensiId);
    byKomp.set(k.kompetensiId, {
      level: Math.max(prev?.level ?? 0, k.levelMinimum),
      wajib: (prev?.wajib ?? false) || k.jenis === 'wajib',
    });
  }
  return [...byKomp.entries()].map(([id, v]) => ({
    id,
    levelMahasiswa: profil.kompetensi?.[id] ?? 0,
    levelKebutuhan: v.level,
    isMandatory: v.wajib,
  }));
}

function assertProfile(p) {
  const problems = [];
  if (typeof p.ipk !== 'number' || p.ipk < 0 || p.ipk > 4) problems.push('ipk must be a number 0-4');
  if (!BIDANG.includes(p.minatBidang)) problems.push(`minatBidang must be one of: ${BIDANG.join(', ')}`);
  if (typeof p.domisili?.lat !== 'number' || typeof p.domisili?.lon !== 'number') problems.push('domisili.lat/lon required');
  if (typeof p.skorPengalamanSertifikasi !== 'number') problems.push('skorPengalamanSertifikasi must be a number');
  if (problems.length) throw new RangeError(`Profil ${p.id ?? '?'} tidak lengkap: ${problems.join('; ')}`);
}

/** Steps 1-4: everything up to the TOPSIS input. */
export function buildDecisionMatrix(profil, dataset) {
  assertProfile(profil);
  const imputasi = computeImputationValues(dataset.tempat);
  const { eligible, excluded } = filterAlternatives(dataset);
  const warnings = [];
  for (const code of ['C5', 'C6']) {
    if (imputasi[code].n === 0) {
      warnings.push(`${code}: tidak ada data nyata pada lowongan Dipakai; semua alternatif diberi ${imputasi[code].nilai}, jadi ${code} tidak memengaruhi urutan.`);
    }
  }

  const namaKompetensi = new Map((dataset.kompetensi ?? []).map((k) => [k.id, k.nama]));
  const alternatives = [];
  const details = {};
  for (const t of eligible) {
    const cga = calculateCompatibilityScore(competenciesFor(t.tempatId, dataset, profil));
    // Add the competency name to each element for the detail screen.
    cga.perElement = cga.perElement.map((e) => ({ ...e, nama: namaKompetensi.get(e.id) ?? e.id }));
    const jarakKm = haversineKm(profil.domisili.lat, profil.domisili.lon, t.lat, t.lon);
    const c5Imputasi = typeof t.benefitFinansial !== 'number';
    const c6Imputasi = typeof t.reputasi !== 'number';
    const values = {
      C1: cga.compatibilityScore,
      C2: c2Score(profil.minatBidang, t.bidang),
      C3: profil.ipk,
      C4: jarakKm,
      C5: c5Imputasi ? imputasi.C5.nilai : t.benefitFinansial,
      C6: c6Imputasi ? imputasi.C6.nilai : t.reputasi,
      C7: profil.skorPengalamanSertifikasi,
    };
    alternatives.push({ id: t.tempatId, values });
    details[t.tempatId] = {
      namaPerusahaan: t.namaPerusahaan,
      posisi: t.posisi,
      bidang: t.bidang,
      lokasi: t.lokasi,
      sumberUrl: t.sumberUrl ?? null,
      tanggalAkses: t.tanggalAkses ?? null,
      values,
      cga,
      flags: { c5Imputasi, c6Imputasi },
    };
  }
  return { alternatives, details, excluded, imputasi, warnings };
}

/**
 * Full pipeline for one mahasiswa. Returns the ranking with, per lowongan,
 * the C1-C7 values, the CGA breakdown (for the gap diagnostics shown to the
 * mahasiswa) and the imputation flags.
 *
 * @param {object} profil
 * @param {object} dataset            data/dataset.json shape
 * @param {object} [options]
 * @param {Array}  [options.criteria] defaults to criteriaC1C7() (provisional literature weights)
 */
export function recommend(profil, dataset, options = {}) {
  const criteria = options.criteria ?? criteriaC1C7();
  const built = buildDecisionMatrix(profil, dataset);
  if (built.alternatives.length === 0) {
    return { profilId: profil.id, ranking: [], excluded: built.excluded, imputasi: built.imputasi, warnings: [...built.warnings, 'Tidak ada alternatif yang memenuhi syarat.'], steps: null };
  }
  const topsis = runTopsis(built.alternatives, criteria);
  const ranking = topsis.ranking.map((r) => {
    const d = built.details[r.id];
    const kesenjangan = d.cga.perElement
      .filter((e) => e.gap !== null && e.gap < 0)
      .sort((a, b) => a.gap - b.gap);
    return { ...r, ...d, kesenjangan };
  });
  return {
    profilId: profil.id,
    ranking,
    excluded: built.excluded,
    imputasi: built.imputasi,
    warnings: [...built.warnings, ...topsis.warnings],
    steps: topsis.steps,
  };
}
