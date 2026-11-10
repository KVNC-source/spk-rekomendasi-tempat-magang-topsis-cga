/**
 * MOCK of the profil endpoints (see CONTRACT in profil.js). Used while the
 * server has no such routes. In dev, append ?mock=slow | error | empty |
 * saveerror to the URL to exercise the loading, error, empty and save-failure
 * states.
 */
import { ApiError } from "./http";

const STORAGE_KEY = "spk-magang:mock-profil";

const KOMPETENSI = [
  { kompetensi_id: 1, nama_kompetensi: "Pemrograman Web (HTML/CSS/JS)", kategori: "Teknis", deskripsi: "Membangun antarmuka web dengan HTML, CSS, dan JavaScript.", skala_maksimum: 4 },
  { kompetensi_id: 2, nama_kompetensi: "React.js / Vue.js", kategori: "Teknis", deskripsi: "Membangun antarmuka berbasis komponen dengan framework JavaScript.", skala_maksimum: 4 },
  { kompetensi_id: 3, nama_kompetensi: "Backend (Node.js / Laravel)", kategori: "Teknis", deskripsi: "Membangun REST API dan logika server.", skala_maksimum: 4 },
  { kompetensi_id: 4, nama_kompetensi: "Basis Data SQL", kategori: "Teknis", deskripsi: "Merancang skema dan menulis query pada basis data relasional.", skala_maksimum: 4 },
  { kompetensi_id: 5, nama_kompetensi: "DevOps / Docker", kategori: "Teknis", deskripsi: "Mengemas dan menjalankan aplikasi dengan container.", skala_maksimum: 4 },
  { kompetensi_id: 6, nama_kompetensi: "Komunikasi Tim", kategori: "Non-Teknis", deskripsi: "Berkomunikasi dan berkoordinasi dalam tim lintas fungsi.", skala_maksimum: 4 },
  { kompetensi_id: 7, nama_kompetensi: "Manajemen Waktu", kategori: "Non-Teknis", deskripsi: "Mengatur prioritas dan memenuhi tenggat.", skala_maksimum: 4 },
  { kompetensi_id: 8, nama_kompetensi: "Adaptabilitas", kategori: "Non-Teknis", deskripsi: "Menyesuaikan diri dengan perubahan teknologi dan kebutuhan kerja.", skala_maksimum: 4 },
];

const BIDANG_MINAT = [
  "Web Development",
  "Data Science",
  "Jaringan Komputer",
  "Keamanan Siber",
  "Mobile Development",
  "Kecerdasan Buatan",
];

const INITIAL_PROFIL = {
  mahasiswa: { mahasiswa_id: 1, nim: "230211060068", nama: "Keefa Noah Lasut", angkatan: 2023 },
  ipk: 3.62,
  minat_bidang: "Web Development",
  // 4 of 8 elements filled, matching the "50% terisi" state in Gambar 3.11.
  kompetensi: [
    { kompetensi_id: 1, level_penguasaan: 3 },
    { kompetensi_id: 3, level_penguasaan: 2 },
    { kompetensi_id: 4, level_penguasaan: 3 },
    { kompetensi_id: 2, level_penguasaan: 2 },
  ],
};

const mode = () =>
  import.meta.env.DEV && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("mock")
    : null;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_PROFIL;
  } catch {
    return INITIAL_PROFIL;
  }
}

function writeStore(profil) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profil));
  } catch {
    /* storage unavailable: the mock simply does not persist */
  }
}

async function latency() {
  await wait(mode() === "slow" ? 3500 : 450);
  if (mode() === "error") throw new ApiError(500, "Server sedang bermasalah. Coba lagi beberapa saat.");
}

export async function getKompetensi() {
  await latency();
  return mode() === "empty" ? [] : KOMPETENSI;
}

export async function getBidangMinat() {
  await latency();
  return BIDANG_MINAT;
}

export async function getProfil() {
  await latency();
  return readStore();
}

export async function putProfil(payload) {
  await wait(700);
  if (mode() === "saveerror") throw new ApiError(500, "Profil belum dapat disimpan. Coba lagi.");
  const next = { ...readStore(), ...payload };
  writeStore(next);
  return next;
}
