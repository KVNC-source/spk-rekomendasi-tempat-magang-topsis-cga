import { Card, Skeleton } from "../../components/ui";

/** Placeholder shaped like the loaded form, so the page does not jump. */
export default function ProfilSkeleton() {
  return (
    <div role="status" aria-label="Sedang memuat profil kompetensimu" className="space-y-5">
      {[3, 3].map((rows, g) => (
        <Card key={g} padded={false}>
          <div className="flex items-center justify-between border-b border-line px-4 py-4 md:px-5">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="divide-y divide-line px-4 md:px-5">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="py-4">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="mt-2 h-4 w-4/5" />
                <div className="mt-4 grid grid-cols-4 items-end gap-1.5">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-[4.5rem]" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
