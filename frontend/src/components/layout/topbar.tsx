"use client";

import { Bell, LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { signOut } from "@/features/auth/session";
import { ROLE_LABEL } from "@/lib/roles";
import { initials } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import { Breadcrumbs } from "./breadcrumbs";

function Popover({ label, trigger, children }: { label: string; trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-md p-1.5 hover:bg-sunken">
        {trigger}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-line bg-surface shadow-lg" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem("tms.theme", dark ? "dark" : "light");
  } catch {
    /* preference just won't persist */
  }
}

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setMobileOpen = useUiStore((s) => s.setMobileOpen);

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <button className="rounded p-2 hover:bg-sunken md:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1"><Breadcrumbs /></div>

      <button onClick={toggleTheme} aria-label="Toggle dark mode" className="rounded-md p-2 hover:bg-sunken">
        <Sun className="hidden h-[18px] w-[18px] dark:block" />
        <Moon className="h-[18px] w-[18px] dark:hidden" />
      </button>

      <Popover label="Notifications" trigger={<Bell className="h-[18px] w-[18px]" />}>
        <div className="p-4 text-sm">
          <p className="font-medium">No notifications</p>
          <p className="mt-1 text-muted">The backend has no notifications API yet, so nothing can be delivered here.</p>
        </div>
      </Popover>

      <Popover
        label="Account menu"
        trigger={
          <>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-fg">{initials(user.name)}</span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium">{user.name}</span>
              <span className="block text-xs text-muted">{ROLE_LABEL[user.role]}</span>
            </span>
          </>
        }
      >
        <div className="border-b border-line p-3 text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="truncate text-muted">{user.email ?? user.phone}</p>
        </div>
        <div className="p-1">
          <Link href="/profile" className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-sunken"><UserRound className="h-4 w-4" /> Profile</Link>
          <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-sunken"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </Popover>
    </header>
  );
}
