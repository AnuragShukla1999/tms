import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({ label, value, loading }: { label: string; value?: number | string; loading?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      {loading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-1 text-2xl font-semibold tabular-nums">{value ?? "—"}</p>}
    </Card>
  );
}
