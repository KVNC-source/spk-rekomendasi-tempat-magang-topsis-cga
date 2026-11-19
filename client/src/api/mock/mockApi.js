/**
 * MOCK of the server, in the browser. It runs a COPY of the real engine
 * (./engine, ./data/dataset.json — copied from the spk-engine folder) so the
 * ranking responds to the profile. Delete this folder once the real API exists.
 *
 * Dev switches (append to the URL): ?mock=slow | error | empty | saveerror |
 * lengkap (complete sample profile) | reset (back to the incomplete sample).
 */
import { ApiError } from "../http";
import dataset from "./data/dataset.json";
import { recommend } from "./engine/matrix.js";
import { BIDANG, KOMPETENSI, KOTA } from "./masterData";
import { hitungSkorPengalaman } from "./skorPengalaman";

// v3: the saved pilihan joined the store. Bump again when the stored shape changes.
const KEY = "spk-magang:mock-v3";

// profil_contoh.json › CONTOH-WEB-MANADO. Missing keys stay UNANSWERED here
// (the form must force an explicit choice, including 0 = "Belum punya").
const SAMPLE_LEVELS = {
  K01: 3, K02: 3, K03: 2, K04: 2, K05: 2, K07: 2,
  K12: 1, K15: 2, K16: 2, K18: 3, K19: 3, K20: 2, K21: 1,
};

const now = () => new Date().toISOString();

const levelsToList = (levels) =>
  Object.entries(levels).map(([kompetensi_id, level_penguasaan]) => ({ kompetensi_id, level_penguasaan }));

/** "Lengkap" only when all 21 kompetensi and every data field are filled; otherwise "Draf". */
function profilStatus(profil) {
  const answered = new Set(profil.kompetensi.map((k) => k.kompetensi_id));
  const complete =
    KOMPETENSI.every((k) => answered.has(k.kompetensi_id)) &&
    profil.ipk != null &&
    Boolean(profil.minat_bidang) &&
    Boolean(profil.domisili) &&
    profil.jumlah_proyek != null &&
    profil.jumlah_sertifikasi != null;
  return complete ? "Lengkap" : "Draf";
}

const withStatus = (profil) => ({ ...profil, status: profilStatus(profil) });

function initialProfil({ complete = false } = {}) {
  const levels = complete
    ? Object.fromEntries(KOMPETENSI.map((k) => [k.kompetensi_id, SAMPLE_LEVELS[k.kompetensi_id] ?? 0]))
    : SAMPLE_LEVELS;
  const manado = KOTA.find((k) => k.kota === "Manado") ?? KOTA[0];
  return {
    mahasiswa: { mahasiswa_id: 1, nim: "230211060068", nama: "Keefa Noah Lasut", angkatan: 2023 },
    ipk: 3.62,
    minat_bidang: "Web Development",
    domisili: manado ? { kota: manado.kota, lat: manado.lat, lon: manado.lon } : null,
    jumlah_proyek: 2,
    jumlah_sertifikasi: 1,
    kompetensi: levelsToList(levels),
    diperbarui_pada: now(),
  };
}

const mode = () =>
  import.meta.env.DEV && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("mock")
    : null;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readStore() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to the initial state */
  }
  return { profil: initialProfil(), rekomendasi: null, pilihan: null };
}

function writeStore(store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable: the mock simply does not persist */
  }
}

// Apply ?mock=lengkap / ?mock=reset once per page load.
let seeded = false;
function seed() {
  if (seeded) return;
  seeded = true;
  if (mode() === "lengkap") writeStore({ profil: initialProfil({ complete: true }), rekomendasi: null, pilihan: null });
  if (mode() === "reset") writeStore({ profil: initialProfil(), rekomendasi: null, pilihan: null });
}

async function latency(ms = 450) {
  seed();
  await wait(mode() === "slow" ? 3500 : ms);
  if (mode() === "error") throw new ApiError(500, "Server sedang bermasalah.");
}

export async function getKompetensi() {
  await latency();
  return mode() === "empty" ? [] : KOMPETENSI;
}

export async function getBidangMinat() {
  await latency();
  return BIDANG;
}

export async function getKotaDomisili() {
  await latency();
  return KOTA;
}

export async function getProfil() {
  await latency();
  return withStatus(readStore().profil);
}

export async function putProfil(payload) {
  await wait(700);
  if (mode() === "saveerror") throw new ApiError(500, "Profil belum bisa disimpan.");
  const store = readStore();
  store.profil = { ...store.profil, ...payload, diperbarui_pada: now() };
  writeStore(store);
  return withStatus(store.profil);
}

export async function postRekomendasi() {
  await latency(1100);
  const store = readStore();
  const { profil } = store;

  const dataKurang = [
    profil.ipk == null && "ipk",
    !profil.minat_bidang && "minat_bidang",
    !profil.domisili && "domisili",
    profil.jumlah_proyek == null && "jumlah_proyek",
    profil.jumlah_sertifikasi == null && "jumlah_sertifikasi",
  ].filter(Boolean);
  // An unanswered kompetensi does not block: the engine counts a missing key as level 0.
  if (dataKurang.length > 0) {
    throw new ApiError(422, "Profil belum lengkap.", { belum_diisi: [], data_kurang: dataKurang });
  }

  const engineProfil = {
    id: `M${profil.mahasiswa.mahasiswa_id}`,
    ipk: profil.ipk,
    minatBidang: profil.minat_bidang,
    domisili: { lat: profil.domisili.lat, lon: profil.domisili.lon },
    skorPengalamanSertifikasi: hitungSkorPengalaman(profil.jumlah_proyek, profil.jumlah_sertifikasi),
    kompetensi: Object.fromEntries(profil.kompetensi.map((k) => [k.kompetensi_id, k.level_penguasaan])),
  };

  let hasil;
  try {
    hasil = recommend(engineProfil, dataset);
  } catch (error) {
    throw new ApiError(422, error.message);
  }

  const byId = new Map(dataset.tempat.map((t) => [t.tempatId, t]));
  store.rekomendasi = {
    ...hasil,
    // Ask for the real API: `excluded` should carry the names too.
    excluded: hasil.excluded.map((e) => ({
      ...e,
      namaPerusahaan: byId.get(e.tempatId)?.namaPerusahaan,
      posisi: byId.get(e.tempatId)?.posisi,
    })),
    dihitungPada: now(),
    profilDiperbaruiPada: profil.diperbarui_pada,
  };
  writeStore(store);
  return store.rekomendasi;
}

export async function getRekomendasiTerakhir() {
  await latency();
  const { rekomendasi } = readStore();
  if (!rekomendasi) throw new ApiError(404, "Belum ada rekomendasi.");
  return rekomendasi;
}

// --- Pilihan: the lowongan the mahasiswa saved as their choice (one at a time).

export async function getPilihan() {
  await latency();
  return readStore().pilihan ?? null;
}

export async function putPilihan(tempatId) {
  await wait(600);
  if (mode() === "saveerror") throw new ApiError(500, "Pilihanmu belum bisa disimpan.");
  const store = readStore();
  const item = store.rekomendasi?.ranking.find((r) => r.id === tempatId);
  if (!item) throw new ApiError(404, "Tempat magang ini tidak ada di hasil rekomendasimu.");
  store.pilihan = {
    tempat_id: item.id,
    namaPerusahaan: item.namaPerusahaan,
    posisi: item.posisi,
    sumberUrl: item.sumberUrl,
    tanggalAkses: item.tanggalAkses,
    topsis_id: null,
    disimpan_pada: now(),
  };
  writeStore(store);
  return store.pilihan;
}

export async function deletePilihan() {
  await wait(400);
  const store = readStore();
  store.pilihan = null;
  writeStore(store);
  return null;
}

// --- Login (mock). Development only: it accepts the two CONTOH emails with ANY
// non-empty password. The real server checks a hashed password and limits attempts.

const SESSION_KEY = "spk-magang:mock-session";
const AKUN_CONTOH = {
  "contoh-web-manado@example.invalid": "mahasiswa",
  "contoh-admin@example.invalid": "administrator",
};

function penggunaDariSesi(email) {
  const role = AKUN_CONTOH[email];
  if (!role) return null;
  if (role === "administrator") {
    return { user_id: 3, email, username: "contoh-admin", role, mahasiswa_id: null, nama: "contoh-admin", nim: null };
  }
  const { mahasiswa } = readStore().profil;
  return {
    user_id: 1,
    email,
    username: "contoh-web-manado",
    role,
    mahasiswa_id: mahasiswa.mahasiswa_id,
    nama: mahasiswa.nama,
    nim: mahasiswa.nim,
  };
}

export async function login(email, password) {
  seed();
  await wait(600);
  // ?mock=terkunci shows the "too many attempts" state.
  if (mode() === "terkunci") {
    throw new ApiError(429, "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.");
  }
  const emailBersih = String(email ?? "").trim().toLowerCase();
  if (!AKUN_CONTOH[emailBersih] || !password) throw new ApiError(401, "Email atau kata sandi salah.");
  try {
    window.localStorage.setItem(SESSION_KEY, emailBersih);
  } catch {
    /* storage unavailable: the mock session just does not persist */
  }
  return penggunaDariSesi(emailBersih);
}

export async function logout() {
  await wait(200);
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** The signed-in user; throws 401 when nobody is signed in, like GET /api/auth/me. */
export async function me() {
  seed();
  await wait(250);
  let email = null;
  try {
    email = window.localStorage.getItem(SESSION_KEY);
  } catch {
    /* treated as signed out */
  }
  const user = email ? penggunaDariSesi(email) : null;
  if (!user) throw new ApiError(401, "Silakan masuk dulu.");
  return user;
}
