/** SPK Magang mark: four ascending steps, the top one in azure. */
export default function BrandMark({ className = "size-9" }) {
  return (
    <svg viewBox="0 0 36 36" role="img" aria-label="SPK Magang" className={className}>
      <rect width="36" height="36" rx="10" className="fill-navy-700" />
      <rect x="7" y="21" width="4.5" height="8" rx="1.2" className="fill-navy-200" />
      <rect x="13" y="17" width="4.5" height="12" rx="1.2" className="fill-navy-200" />
      <rect x="19" y="13" width="4.5" height="16" rx="1.2" className="fill-navy-200" />
      <rect x="25" y="8" width="4.5" height="21" rx="1.2" className="fill-azure-400" />
    </svg>
  );
}
