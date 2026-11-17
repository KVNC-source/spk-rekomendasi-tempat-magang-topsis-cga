/**
 * Level 0 — "Belum punya" (tidak dimiliki). Added with the revised CGA: it is a
 * deliberate answer, different from "not answered yet". Tabel 2.1 has no
 * wording for it, so this description is new and should be added to the proposal.
 */
export const LEVEL_NOL = {
  level: 0,
  label: "Belum punya",
  english: "None",
  description: "Belum pernah mempelajari atau mencoba elemen ini. Ini jawaban yang sah, bukan kesalahan.",
};

/** Tabel 2.1 — Skala Level Penguasaan Kompetensi (levels 1–4). */
export const LEVELS = [
  {
    level: 1,
    label: "Dasar",
    english: "Beginner",
    description:
      "Mengetahui konsep dasar; dapat menjalankan tugas sederhana dengan bimbingan intensif dari supervisor.",
  },
  {
    level: 2,
    label: "Menengah",
    english: "Intermediate",
    description:
      "Memahami konsep secara mendalam; dapat menyelesaikan tugas standar secara mandiri dengan sesekali konsultasi.",
  },
  {
    level: 3,
    label: "Mahir",
    english: "Advanced",
    description:
      "Menguasai kompetensi secara komprehensif; dapat menyelesaikan tugas kompleks secara mandiri dan membimbing orang lain.",
  },
  {
    level: 4,
    label: "Ahli",
    english: "Expert",
    description:
      "Memiliki keahlian mendalam; dapat merancang solusi inovatif, menetapkan standar, dan menyelesaikan masalah yang belum pernah ditemui sebelumnya.",
  },
];

export const levelLabel = (level) =>
  level === 0 ? LEVEL_NOL.label : (LEVELS.find((l) => l.level === level)?.label ?? null);

/**
 * Tabel 2.2 — interpretasi nilai gap (student level 0–4 vs required 1–4). `kind`
 * drives the icon and tone so the status never relies on colour alone.
 */
export function gapStatus(studentLevel, requiredLevel) {
  if (!Number.isInteger(studentLevel) || !Number.isInteger(requiredLevel)) {
    return { gap: null, kind: "none", label: "Belum dinilai" };
  }
  const gap = studentLevel - requiredLevel;
  if (gap >= 1) return { gap, kind: "exceeded", label: "Sangat Sesuai" };
  if (gap === 0) return { gap, kind: "met", label: "Sesuai" };
  if (gap === -1) return { gap, kind: "short", label: "Cukup Sesuai" };
  if (gap === -2) return { gap, kind: "short", label: "Kurang Sesuai" };
  return { gap, kind: "short", label: "Tidak Sesuai" };
}
