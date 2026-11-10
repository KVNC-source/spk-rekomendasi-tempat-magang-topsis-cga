const ID = "id-ID";

/** 3.6 -> "3,60" (Indonesian decimal comma). */
export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "–";
  return Number(value).toLocaleString(ID, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Accepts "3,62" or "3.62". Returns null when the text is not a valid number. */
export function parseDecimal(text) {
  const clean = String(text ?? "")
    .trim()
    .replace(",", ".");
  if (clean === "" || !/^\d+(\.\d+)?$/.test(clean)) return null;
  return Number(clean);
}

export function formatTime(date) {
  return date.toLocaleTimeString(ID, { hour: "2-digit", minute: "2-digit" });
}
