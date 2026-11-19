const ID = "id-ID";

/** 3.6 -> "3,60" (Indonesian decimal comma). */
export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "–";
  return Number(value).toLocaleString(ID, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Up to `max` decimals, none forced: 1.5 -> "1,5", 0 -> "0", 0.875 -> "0,88". */
export function formatTrim(value, max = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "–";
  return Number(value).toLocaleString(ID, { minimumFractionDigits: 0, maximumFractionDigits: max });
}

/** Accepts "3,62" or "3.62". Returns null when the text is not a valid number. */
export function parseDecimal(text) {
  const clean = String(text ?? "")
    .trim()
    .replace(",", ".");
  if (clean === "" || !/^\d+(\.\d+)?$/.test(clean)) return null;
  return Number(clean);
}

/** "2026-11-05" -> "5 November 2026". Date-only strings are read as local dates, so no day shift. */
export function formatDate(value) {
  if (!value) return "–";
  const text = String(value);
  const date = /^d{4}-d{2}-d{2}$/.test(text) ? new Date(`${text}T00:00:00`) : new Date(text);
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleDateString(ID, { day: "numeric", month: "long", year: "numeric" });
}

export function formatTime(date) {
  return date.toLocaleTimeString(ID, { hour: "2-digit", minute: "2-digit" });
}

/** "baru saja", "3 menit yang lalu", "2 jam yang lalu", "kemarin" … */
export function formatRelative(from, now = Date.now()) {
  const seconds = Math.round((now - new Date(from).getTime()) / 1000);
  if (seconds < 60) return "baru saja";
  const rtf = new Intl.RelativeTimeFormat(ID, { numeric: "auto" });
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

/** "Keefa Noah" -> "KN" (first letters of the first two words). */
export function inisial(nama = "") {
  return nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
