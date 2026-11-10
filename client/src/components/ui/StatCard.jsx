import Card from "./Card";

/** A single headline number with its label. Numbers are always set in mono. */
export default function StatCard({ label, value, unit, hint, icon: Icon, className = "" }) {
  return (
    <Card className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="mt-1 flex items-baseline gap-1">
          <span className="font-mono text-3xl font-semibold text-ink">{value}</span>
          {unit && <span className="font-mono text-sm text-muted">{unit}</span>}
        </p>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      {Icon && (
        <span className="grid size-10 shrink-0 place-items-center rounded-ctl bg-sea-100 text-sea-800">
          <Icon aria-hidden="true" size={20} strokeWidth={1.9} />
        </span>
      )}
    </Card>
  );
}
