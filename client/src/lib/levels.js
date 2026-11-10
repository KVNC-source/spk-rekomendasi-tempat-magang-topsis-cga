/** Tabel 2.1 — Skala Level Penguasaan Kompetensi. */
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

export const levelLabel = (level) => LEVELS.find((l) => l.level === level)?.label ?? null;

/**
 * Tabel 2.2 — interpretasi nilai gap. `kind` drives the icon and tone so the
 * status never relies on colour alone.
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
