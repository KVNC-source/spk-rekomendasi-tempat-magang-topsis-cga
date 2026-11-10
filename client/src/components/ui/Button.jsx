import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const base =
  "press inline-flex min-h-11 min-w-11 select-none items-center justify-center gap-2 rounded-ctl px-4 text-base font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-60 aria-busy:pointer-events-none";

const variants = {
  // Coral is reserved for the main action on a screen.
  primary: "bg-coral-600 text-white hover:bg-coral-700 active:bg-coral-700",
  secondary: "bg-sea-700 text-white hover:bg-sea-800 active:bg-sea-800",
  outline: "border-2 border-sea-700 bg-transparent text-sea-800 hover:bg-sea-50 active:bg-sea-100",
  ghost: "text-sea-800 hover:bg-sea-100 active:bg-sea-200",
  light: "bg-sand-100 text-sea-900 hover:bg-sand-200 active:bg-sand-300",
  // The "it worked" state, reached through `status="success"`.
  success: "bg-sea-700 text-white",
};

const sizes = {
  md: "",
  lg: "min-h-12 px-5",
};

/**
 * Renders a <button>, a router <Link> (`to`) or an <a> (`href`).
 *
 * `status` drives the designed states: "loading" swaps the label and blocks
 * double submits; "success" turns the button into a confirmed state (check
 * icon + `successLabel`) instead of firing a toast.
 */
export default function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  to,
  href,
  status = "idle",
  loadingLabel,
  successLabel,
  className = "",
  children,
  ...rest
}) {
  const loading = status === "loading";
  const success = status === "success";
  const classes = `${base} ${success ? variants.success : variants[variant]} ${sizes[size]} ${className}`;

  const label = loading ? (loadingLabel ?? children) : success ? (successLabel ?? children) : children;
  const LeadingIcon = success ? Check : Icon;

  // Re-keyed on every status change so the new state settles in.
  const content = (
    <span key={status} className={`inline-flex items-center gap-2 ${status !== "idle" ? "motion-pop" : ""}`}>
      {LeadingIcon && iconPosition === "left" && (
        <LeadingIcon
          aria-hidden="true"
          size={18}
          strokeWidth={success ? 3 : 2}
          className={loading ? "animate-pulse" : undefined}
        />
      )}
      <span>{label}</span>
      {Icon && !success && iconPosition === "right" && <Icon aria-hidden="true" size={18} strokeWidth={2} />}
    </span>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={classes}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      disabled={rest.disabled}
      {...rest}
    >
      {content}
    </button>
  );
}
