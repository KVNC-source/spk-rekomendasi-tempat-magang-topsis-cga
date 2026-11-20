import { ArrowDown, Check, ChevronsUp, Flag, Minus } from "lucide-react";
import { LEVEL_NOL, LEVELS, gapStatus, levelLabel } from "../../lib/levels";
import Chip from "./Chip";

/**
 * The signature component: four ascending steps (1 Dasar · 2 Menengah ·
 * 3 Mahir · 4 Ahli) standing on a ground bar (0 Belum punya). An input on the
 * profil form; read-only with a `required` marker on the detail page and the
 * koordinator view.
 *
 * Picking a level fills the steps up to it, lowest first, then the chosen step
 * lands solid with a check. The required-level marker never animates, so the
 * gap stays readable at a glance. State never relies on colour alone: the
 * chosen step carries a check, the required one a flag and a ring.
 *
 * `value` is null while unanswered, 0 for "Belum punya", 1–4 otherwise.
 */
const heights = ["h-12", "h-14", "h-16", "h-[4.5rem]"];
const STAGGER_MS = 40;
const SOLID_LAG_MS = 80;

const requiredRing = "ring-2 ring-coral-600 ring-offset-2 ring-offset-surface";

function RequiredRow({ required }) {
  return (
    <div aria-hidden="true" className="mb-1.5 grid grid-cols-4 gap-1.5">
      {LEVELS.map(({ level }) => (
        <span key={level} className="flex items-center justify-center gap-1 text-xs font-semibold text-coral-700">
          {required === level && (
            <>
              <Flag size={12} strokeWidth={2.5} />
              Min.
            </>
          )}
        </span>
      ))}
    </div>
  );
}

/** One step. `index` (0–3) orders the stagger; fills animate transform + opacity only. */
function Step({ level, label, index, value, required, interactive }) {
  const selected = value === level;
  const climbed = value !== null && level < value;
  // Lower steps fill first; the chosen step lands last. Un-filling is instant.
  const tintDelay = climbed ? index * STAGGER_MS : 0;
  const solidDelay = selected ? index * STAGGER_MS + SOLID_LAG_MS : 0;

  return (
    <span
      className={`relative isolate flex ${heights[index]} flex-col items-center justify-center overflow-hidden rounded-tile border-2 bg-mist-50 px-1 text-center transition-[transform,background-color,border-color] duration-fast ease-out-soft ${
        selected ? "border-navy-950" : climbed ? "border-navy-300" : "border-line-strong"
      } ${interactive ? "group-hover:bg-navy-50 group-active:scale-[0.96]" : ""} ${
        required === level ? requiredRing : ""
      }`}
    >
      <span aria-hidden="true" className="ladder-fill absolute inset-0 -z-10 bg-navy-200" data-on={climbed || selected} style={{ transitionDelay: `${tintDelay}ms` }} />
      <span aria-hidden="true" className="ladder-fill absolute inset-0 -z-10 bg-navy-800" data-on={selected} style={{ transitionDelay: `${solidDelay}ms` }} />
      <span
        className="ladder-check absolute right-1 top-1 text-white"
        data-on={selected}
        style={{ transitionDelay: selected ? `${solidDelay + 60}ms` : "0ms" }}
      >
        <Check aria-hidden="true" size={13} strokeWidth={3} />
      </span>
      <span
        className={`font-mono text-base font-semibold leading-none transition-colors duration-fast ${selected ? "text-white" : "text-ink"}`}
        style={{ transitionDelay: selected ? `${solidDelay}ms` : "0ms" }}
      >
        {level}
      </span>
      <span
        className={`mt-1 text-xs font-semibold leading-tight transition-colors duration-fast ${selected ? "text-white" : "text-ink"}`}
        style={{ transitionDelay: selected ? `${solidDelay}ms` : "0ms" }}
      >
        {label}
      </span>
      {required === level && interactive && <span className="sr-only"> (kebutuhan minimum)</span>}
    </span>
  );
}

/** Level 0: the ground the steps stand on. Dashed until chosen. */
function Ground({ value, interactive }) {
  const selected = value === 0;
  return (
    <span
      className={`relative isolate flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-tile border-2 bg-mist-50 px-3 text-sm font-semibold transition-[transform,background-color,border-color] duration-fast ease-out-soft ${
        selected ? "border-navy-950 text-white" : "border-dashed border-line-strong text-ink"
      } ${interactive ? "group-hover:bg-navy-50 group-active:scale-[0.98]" : ""}`}
    >
      <span aria-hidden="true" className="ladder-fill absolute inset-0 -z-10 bg-navy-800" data-on={selected} />
      {selected && <Check aria-hidden="true" size={15} strokeWidth={3} />}
      <span className="font-mono">0</span>
      <span>{LEVEL_NOL.label}</span>
    </span>
  );
}

export default function LevelLadder({
  name,
  label,
  value = null,
  onChange,
  required = null,
  readOnly = false,
  allowZero = true,
  describedBy,
  className = "",
}) {
  const interactive = !readOnly && typeof onChange === "function";

  if (!interactive) {
    const status = required !== null && value !== null ? gapStatus(value, required) : null;
    const summary = [
      `${label ? `${label}: ` : ""}level kamu ${value !== null ? `${value} ${levelLabel(value)}` : "belum dinilai"}`,
      required !== null ? `kebutuhan minimum ${required} ${levelLabel(required)}` : null,
      status ? status.label : null,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <div role="img" aria-label={summary} className={className}>
        {required !== null && <RequiredRow required={required} />}
        <div className="grid grid-cols-4 items-end gap-1.5">
          {LEVELS.map(({ level, label: stepLabel }, i) => (
            <Step key={level} level={level} label={stepLabel} index={i} value={value} required={required} interactive={false} />
          ))}
        </div>
        {allowZero && (
          <div className="mt-1.5">
            <Ground value={value} interactive={false} />
          </div>
        )}
      </div>
    );
  }

  return (
    <fieldset className={`m-0 min-w-0 border-0 p-0 ${className}`} aria-describedby={describedBy}>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-col">
        {/* Ground first in the DOM (arrow keys run 0,1,2,3,4); shown last. */}
        {allowZero && (
          <label className="group relative order-2 mt-1.5 block cursor-pointer">
            <input
              type="radio"
              name={name}
              value={0}
              checked={value === 0}
              onChange={() => onChange(0)}
              className="peer sr-only"
            />
            <span className="block rounded-tile peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-navy-700">
              <Ground value={value} interactive />
            </span>
          </label>
        )}
        <div className="order-1">
          {required !== null && <RequiredRow required={required} />}
          <div className="grid grid-cols-4 items-end gap-1.5">
            {LEVELS.map(({ level, label: stepLabel }, i) => (
              <label key={level} className="group relative block cursor-pointer">
                <input
                  type="radio"
                  name={name}
                  value={level}
                  checked={value === level}
                  onChange={() => onChange(level)}
                  className="peer sr-only"
                />
                <span className="block rounded-tile peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-navy-700">
                  <Step level={level} label={stepLabel} index={i} value={value} required={required} interactive />
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </fieldset>
  );
}

const gapIcons = {
  exceeded: { icon: ChevronsUp, tone: "navy" },
  met: { icon: Check, tone: "navy" },
  short: { icon: ArrowDown, tone: "coral" },
  none: { icon: Minus, tone: "neutral" },
};

/** Text + icon + tone for a gap, e.g. "Cukup Sesuai  −1". */
export function GapBadge({ student, required, className = "" }) {
  const status = gapStatus(student, required);
  const { icon, tone } = gapIcons[status.kind];
  const gapText = status.gap === null ? "" : ` ${status.gap > 0 ? "+" : status.gap < 0 ? "−" : ""}${Math.abs(status.gap)}`;
  return (
    <Chip tone={tone} icon={icon} className={className}>
      {status.label}
      {gapText && <span className="font-mono">{gapText}</span>}
    </Chip>
  );
}

/** Tiny decorative version of the ladder, for legends. */
export function LadderGlyph({ level, className = "" }) {
  return (
    <svg viewBox="0 0 30 24" aria-hidden="true" className={className} fill="none">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 7.5}
          y={24 - (8 + i * 5)}
          width="6"
          height={8 + i * 5}
          rx="1.5"
          className={i < level ? "fill-navy-700" : "fill-navy-200"}
        />
      ))}
    </svg>
  );
}
