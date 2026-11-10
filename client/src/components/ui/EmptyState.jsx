import { CircleAlert, Inbox } from "lucide-react";

/**
 * One component for "nothing here yet" and "something went wrong". Both say
 * what happened and give the student something to do next (`action`).
 */
export default function EmptyState({
  variant = "empty",
  icon,
  title,
  description,
  action,
  className = "",
}) {
  const isError = variant === "error";
  const Icon = icon ?? (isError ? CircleAlert : Inbox);

  return (
    <div
      role={isError ? "alert" : undefined}
      className={`motion-rise rounded-card border border-dashed px-6 py-10 ${
        isError ? "border-coral-300 bg-coral-50" : "border-line-strong bg-sand-50"
      } ${className}`}
    >
      <div className="mx-auto flex max-w-sm flex-col items-center text-center">
        <span
          className={`mb-4 grid size-14 place-items-center rounded-ctl ${
            isError ? "bg-coral-100 text-coral-700" : "bg-sea-100 text-sea-800"
          }`}
        >
          <Icon aria-hidden="true" size={26} strokeWidth={1.75} />
        </span>
        <h2 className="font-display text-xl font-bold leading-snug text-ink">{title}</h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
