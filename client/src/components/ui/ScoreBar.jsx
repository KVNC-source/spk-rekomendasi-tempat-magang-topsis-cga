import { formatNumber } from "../../lib/format";
import CountUp from "./CountUp";

const fills = {
  sea: "bg-sea-600",
  coral: "bg-coral-500",
  ondark: "bg-coral-400",
};

/**
 * Horizontal meter, e.g. the C1 Compatibility Score (0–100 %). The bar grows in
 * once on mount; with `countUp` the number counts up once on first view.
 */
export default function ScoreBar({
  label,
  value,
  max = 100,
  unit = "%",
  tone = "sea",
  digits = 1,
  countUp = false,
  onDark = false,
  className = "",
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className={`text-sm font-medium ${onDark ? "text-sea-200" : "text-muted"}`}>{label}</span>
        <span className={`font-mono text-sm font-semibold ${onDark ? "text-sand-100" : "text-ink"}`}>
          {countUp ? <CountUp value={value} digits={digits} /> : formatNumber(value, digits)}
          {unit}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${formatNumber(value, digits)}${unit}`}
        className={`h-2.5 overflow-hidden rounded-full ${onDark ? "bg-sea-700" : "bg-sand-200"}`}
      >
        <div
          className={`motion-grow h-full w-full rounded-full ${fills[onDark ? "ondark" : tone]}`}
          style={{ transform: `scaleX(${pct / 100})`, transformOrigin: "left" }}
        />
      </div>
    </div>
  );
}
