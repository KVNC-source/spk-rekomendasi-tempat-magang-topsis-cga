import { formatNumber } from "../../lib/format";

const fills = {
  sea: "bg-sea-600",
  coral: "bg-coral-500",
};

/** Horizontal meter, e.g. the C1 Compatibility Score (0–100 %). Grows in once, on mount. */
export default function ScoreBar({ label, value, max = 100, unit = "%", tone = "sea", digits = 1, className = "" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className="font-mono text-sm font-semibold text-ink">
          {formatNumber(value, digits)}
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
        className="h-2.5 overflow-hidden rounded-full bg-sand-200"
      >
        <div className={`motion-grow h-full w-full rounded-full ${fills[tone]}`} style={{ transform: `scaleX(${pct / 100})`, transformOrigin: "left" }} />
      </div>
    </div>
  );
}
