import { useEffect, useState } from "react";
import { formatRelative } from "../../lib/format";

/** "3 menit yang lalu", refreshed every 30s so it stays honest while the page is open. */
export default function RelativeTime({ value }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <time dateTime={new Date(value).toISOString()} title={new Date(value).toLocaleString("id-ID")}>
      {formatRelative(value, now)}
    </time>
  );
}
