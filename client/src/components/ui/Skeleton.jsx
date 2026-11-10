/** Loading placeholder. Lists use skeletons, never spinners. */
export default function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-tile bg-sand-200 ${className}`} />;
}
