"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Truck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { listQuery } from "@/features/crud/hooks";
import { listParams } from "@/features/crud/list-params";
import { RESOURCES } from "@/features/resources";
import { NAV_BY_ROLE } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const role = useAuthStore((s) => s.user?.role);
  const pathname = usePathname();
  const items = role ? NAV_BY_ROLE[role] : [];
  const queryClient = useQueryClient();

  // Start loading a page's list as soon as the pointer or finger is on its link, so the data
  // is usually already there when the click completes. Uses the same cache key as the page.
  function prefetch(href: string) {
    const cfg = href.startsWith("/manage/") ? RESOURCES[href.slice("/manage/".length)] : undefined;
    if (cfg) void queryClient.prefetchQuery(listQuery(cfg.path, listParams(cfg)));
  }

  return (
    <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto p-2">
      {items.map(({ href, label, icon: Icon, group }, idx) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        // Show the group title only on the first item of each group.
        const showGroup = !!group && group !== items[idx - 1]?.group;
        return (
          <div key={href}>
            {showGroup && !collapsed && (
              <p className="px-3 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-muted">{group}</p>
            )}
            {showGroup && collapsed && <div className="mx-3 my-2 border-t border-line" aria-hidden />}
            <Link
              href={href}
              onClick={onNavigate}
              onMouseEnter={() => prefetch(href)}
              onFocus={() => prefetch(href)}
              onTouchStart={() => prefetch(href)}
              title={collapsed ? label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                active ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-sunken hover:text-ink",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex h-14 items-center gap-2 border-b border-line px-4", collapsed && "justify-center px-0")}>
      <Truck className="h-5 w-5 text-brand" aria-hidden />
      {!collapsed && <span className="font-semibold tracking-tight">TMS</span>}
    </div>
  );
}

export function Sidebar() {
  const { collapsed, mobileOpen, toggleCollapsed, setMobileOpen } = useUiStore();

  return (
    <>
      <aside className={cn("hidden shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 md:flex", collapsed ? "w-16" : "w-60")}>
        <Brand collapsed={collapsed} />
        <NavList collapsed={collapsed} />
        {/* <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-11 items-center justify-center border-t border-line text-muted hover:bg-sunken"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button> */}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="absolute inset-0 bg-black/40" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-line pr-2">
              {/* <Brand collapsed={false} /> */}
              <button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="rounded p-2 hover:bg-sunken">
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavList collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
