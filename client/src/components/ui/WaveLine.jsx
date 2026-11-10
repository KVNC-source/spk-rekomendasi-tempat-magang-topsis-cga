/**
 * The one quiet motif: a thin, slightly uneven wave line (a nod to the Bunaken
 * sea), drawn by hand. Use at most once per screen, as a divider. Colour comes
 * from `currentColor`.
 */
export default function WaveLine({ className = "" }) {
  return (
    <svg
      viewBox="0 0 600 20"
      preserveAspectRatio="none"
      aria-hidden="true"
      fill="none"
      className={`block h-4 w-full ${className}`}
    >
      <path
        d="M0 11C26 4 52 3 84 9S142 19 178 12S240 2 283 8S354 19 398 13S464 3 506 9S568 16 600 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
