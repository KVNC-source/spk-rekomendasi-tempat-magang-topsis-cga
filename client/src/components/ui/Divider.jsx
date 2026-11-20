/**
 * A straight hairline divider under a page heading. Use at most once per
 * screen. Colour comes from `currentColor`; the box keeps the 16px height the
 * earlier decorative line had, so layouts do not shift.
 */
export default function Divider({ className = "" }) {
  return (
    <div aria-hidden="true" className={`flex h-4 w-full items-center ${className}`}>
      <div className="h-px w-full bg-current" />
    </div>
  );
}
