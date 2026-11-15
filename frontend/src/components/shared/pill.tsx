import { pretty } from "@/lib/format";
import { cn } from "@/lib/utils";

const GOOD = ["ACTIVE", "PAID", "COMPLETED", "DELIVERED", "ACCEPTED", "VERIFIED", "AVAILABLE", "CONFIRMED", "CLOSED", "OWN", "TRUE", "YES", "RECEIVED", "APPROVED"];
const BAD = ["CANCELLED", "REJECTED", "OVERDUE", "FAILED", "EXPIRED", "INACTIVE", "FALSE", "NO", "MAINTENANCE"];

/** Colour-coded label for status-like values (enums and booleans). */
export function Pill({ value, labels }: { value: unknown; labels?: [string, string] }) {
  if (value === null || value === undefined || value === "") return <span className="text-muted">—</span>;
  const isBool = typeof value === "boolean";
  const raw = isBool ? (value ? "TRUE" : "FALSE") : String(value);
  const tone = GOOD.includes(raw) ? "good" : BAD.includes(raw) ? "bad" : "warn";
  const text = isBool ? (labels ?? ["Yes", "No"])[value ? 0 : 1] : pretty(raw);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "good" && "bg-ok-soft text-ok",
        tone === "bad" && "bg-danger-soft text-danger",
        tone === "warn" && "bg-sunken text-ink",
      )}
    >
      {text}
    </span>
  );
}
