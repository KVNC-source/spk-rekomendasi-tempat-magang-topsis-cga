/** Fill gauge made of one notch per item. A notch fills from the left when its item is answered. */
export default function SegmentedProgress({ done, total, label, onDark = false }) {
  const segments = Array.from({ length: Math.max(total, 1) }, (_, i) => i < done);
  const on = onDark ? "bg-coral-400" : "bg-sea-600";
  const off = onDark ? "bg-sea-700" : "bg-sand-300";

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${done} dari ${total} terisi`}
      className="flex h-3 gap-1"
    >
      {segments.map((filled, i) => (
        <span key={i} className={`min-w-0 flex-1 overflow-hidden rounded-tile ${off}`}>
          <span
            className={`block h-full w-full origin-left transition-transform duration-base ease-out-soft ${on}`}
            style={{ transform: filled ? "scaleX(1)" : "scaleX(0)" }}
          />
        </span>
      ))}
    </div>
  );
}
