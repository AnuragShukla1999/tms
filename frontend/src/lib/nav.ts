/** Builds the sidebar menu for each role from the resource registry and lib/access.ts. */
import {
  BookOpen,
  Building2,
  Car,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Route as RouteIcon,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { RESOURCE_LIST } from "@/features/resources";
import { PORTAL_PAGES, ROLE_ACCESS } from "./access";
import type { Role } from "./roles";
import { ROLES } from "./roles";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
}

const dash: NavItem = { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard };

/** Sidebar wording that differs from the page title. */
const LABELS: Record<string, string> = {
  "customer-payments": "Payments",
  "office-expenses": "Expenses",
};

const PORTAL_ICONS: Record<string, LucideIcon> = {
  "my-trips": RouteIcon,
  "my-expenses": Wallet,
  "my-documents": FileText,
  "my-bookings": Package,
  "my-quotations": ClipboardList,
  "my-invoices": Receipt,
  "my-payments": Wallet,
};

function build(role: Role): NavItem[] {
  const allowed = ROLE_ACCESS[role];
  const items: NavItem[] = [dash];

  if (allowed.includes("companies"))
    items.push({ label: "Companies", href: "/companies", icon: Building2, group: "Administration" });

  // Registry order keeps groups together; `roles` (backend guards) is intersected with the role's access list.
  for (const r of RESOURCE_LIST) {
    if (!allowed.includes(r.key) || !r.roles.includes(role)) continue;
    items.push({ label: LABELS[r.key] ?? r.title, href: `/manage/${r.key}`, icon: r.icon, group: r.group });
  }

  if (allowed.includes("ledger")) items.push({ label: "Ledger", href: "/ledger", icon: BookOpen, group: "Finance" });

  if (role === "DRIVER" || role === "CUSTOMER") {
    const group = role === "DRIVER" ? "My work" : "My account";
    for (const p of PORTAL_PAGES[role])
      items.push({ label: p.title, href: `/portal/${p.slug}`, icon: PORTAL_ICONS[p.slug] ?? Car, group });
  }
  return items;
}

export const NAV_BY_ROLE = Object.fromEntries(ROLES.map((r) => [r, build(r)])) as Record<Role, NavItem[]>;
