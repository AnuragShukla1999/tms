"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleDashboard } from "@/features/dashboard/role-dashboard";
import { useAuthStore } from "@/store/auth.store";

// Only the super admin sees charts. Loading this part on demand keeps the chart library
// (recharts is large) out of the dashboard that every other role opens.
const SuperAdminDashboard = dynamic(
  () => import("@/features/dashboard/super-admin-dashboard").then((m) => m.SuperAdminDashboard),
  { loading: () => <Skeleton className="h-64 w-full" /> },
);

export default function DashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <>
      <PageHeader title="Dashboard" description={role === "SUPER_ADMIN" ? "Platform overview, calculated from your companies." : undefined} />
      {role === "SUPER_ADMIN" ? <SuperAdminDashboard /> : <RoleDashboard />}
    </>
  );
}
