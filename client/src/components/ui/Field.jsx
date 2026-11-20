import { ChevronDown, CircleAlert } from "lucide-react";

// default · hover · focus · error · disabled
const control =
  "block min-h-12 w-full rounded-ctl border-2 bg-mist-50 px-4 text-base text-ink transition-colors duration-fast placeholder:text-muted hover:border-ink focus:border-navy-700 disabled:cursor-not-allowed disabled:bg-mist-200 disabled:text-muted disabled:hover:border-line-strong";

function Message({ id, error, hint }) {
  if (error) {
    return (
      <p id={id} className="motion-pop mt-1.5 flex items-start gap-1.5 text-sm font-medium text-coral-700">
        <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
        {error}
      </p>
    );
  }
  return hint ? (
    <p id={id} className="mt-1.5 text-sm text-muted">
      {hint}
    </p>
  ) : null;
}

function describedBy(id, error, hint) {
  return error || hint ? `${id}-msg` : undefined;
}

/** Labelled text input. Labels are always visible; errors are text + icon. */
export function TextField({ id, label, hint, error, mono = false, className = "", ...inputProps }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${control} ${error ? "border-coral-600" : "border-line-strong"} ${mono ? "font-mono" : ""}`}
        {...inputProps}
      />
      <Message id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}

export function SelectField({ id, label, hint, error, className = "", children, ...selectProps }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`${control} appearance-none pr-12 ${error ? "border-coral-600" : "border-line-strong"}`}
          {...selectProps}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          size={20}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink"
        />
      </div>
      <Message id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}

/** Labelled multi-line input (same look and messages as TextField). */
export function TextAreaField({ id, label, hint, error, className = "", rows = 3, ...textareaProps }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${control} min-h-24 resize-y py-3 ${error ? "border-coral-600" : "border-line-strong"}`}
        {...textareaProps}
      />
      <Message id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}
