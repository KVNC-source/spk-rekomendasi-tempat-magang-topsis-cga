const tones = {
  neutral: "bg-sand-200 text-ink",
  sea: "bg-sea-100 text-sea-900",
  coral: "bg-coral-100 text-coral-700",
  outline: "border border-line-strong bg-transparent text-ink",
};

/** Small label. Always pair a tone with text (and an icon where it carries status). */
export default function Chip({ tone = "neutral", icon: Icon, className = "", children }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-tight ${tones[tone]} ${className}`}
    >
      {Icon && <Icon aria-hidden="true" size={13} strokeWidth={2.25} />}
      {children}
    </span>
  );
}
