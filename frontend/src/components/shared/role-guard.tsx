"use client";

import type { ReactNode } from "react";
import { ForbiddenState } from "@/components/shared/states";
import type { Role } from "@/lib/roles";
import { useAuthStore } from "@/store/auth.store";

/** UI-level gate only. The backend's RolesGuard remains the real enforcement. */
export function RoleGuard({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !roles.includes(role)) return <ForbiddenState />;
  return <>{children}</>;
}
