"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RESOURCES } from "@/features/resources";

const LABELS: Record<string, string> = { dashboard: "Dashboard", companies: "Companies", new: "New", profile: "Profile", manage: "Manage", ledger: "Ledger" };

export function Breadcrumbs() {
  const segments = usePathname().split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    href: `/${segments.slice(0, i + 1).join("/")}`,
    label: LABELS[seg] ?? RESOURCES[seg]?.title ?? "Details",
    // /manage has no page of its own, so don't link it.
    linkable: seg !== "manage",
  }));

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1 text-sm text-muted">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1 truncate">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            {i === crumbs.length - 1 || !c.linkable ? (
              <span className={i === crumbs.length - 1 ? "font-medium text-ink" : ""}>{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-ink">{c.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
