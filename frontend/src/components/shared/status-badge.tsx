import { cn } from "@/lib/utils";

export function StatusBadge({ active, labels = ["Active", "Inactive"] }: { active: boolean; labels?: [string, string] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        active ? "bg-ok-soft text-ok" : "bg-sunken text-muted",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-ok" : "bg-muted")} aria-hidden />
      {active ? labels[0] : labels[1]}
    </span>
  );
}
