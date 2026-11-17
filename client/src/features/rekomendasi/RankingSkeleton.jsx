import { Card, Skeleton } from "../../components/ui";

/** Placeholder cards shaped like the ranking, shown while the engine calculates. */
export default function RankingSkeleton({ label = "Sedang menghitung rekomendasimu", count = 4 }) {
  return (
    <ol role="status" aria-label={label} className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Card>
            <div className="flex gap-4">
              <Skeleton className="h-10 w-12 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="mt-5 h-3 w-full" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </Card>
        </li>
      ))}
    </ol>
  );
}
