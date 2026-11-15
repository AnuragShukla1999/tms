import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown instantly inside the app shell while the next page is being loaded.
 * Without this file, clicking a sidebar link shows nothing until the page is fully ready.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-6 space-y-2 rounded-lg border border-line bg-surface p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
