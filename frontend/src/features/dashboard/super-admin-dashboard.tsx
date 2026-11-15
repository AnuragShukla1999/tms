"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorState } from "@/components/shared/states";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanies } from "@/features/companies/hooks";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";

export function SuperAdminDashboard() {
  const { data, isLoading, error, refetch } = useCompanies();

  const stats = useMemo(() => {
    const list = data ?? [];
    const sum = (k: "users" | "customers" | "vehicles" | "drivers") => list.reduce((n, c) => n + c._count[k], 0);
    const byMonth = new Map<string, number>();
    for (const c of [...list].reverse()) {
      const key = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" }).format(new Date(c.createdAt));
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    return {
      total: list.length,
      active: list.filter((c) => c.isActive).length,
      users: sum("users"), customers: sum("customers"), vehicles: sum("vehicles"), drivers: sum("drivers"),
      growth: [...byMonth].map(([month, companies]) => ({ month, companies })),
      recent: list.slice(0, 5),
    };
  }, [data]);

  if (error) return <Card><ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} /></Card>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Companies" value={stats.total} loading={isLoading} />
        <StatCard label="Active companies" value={stats.active} loading={isLoading} />
        <StatCard label="Users" value={stats.users} loading={isLoading} />
        <StatCard label="Customers" value={stats.customers} loading={isLoading} />
        <StatCard label="Vehicles" value={stats.vehicles} loading={isLoading} />
        <StatCard label="Drivers" value={stats.drivers} loading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Companies added per month" description="Based on each company's creation date." />
          <div className="h-64 p-4">
            {isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.growth}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="var(--muted)" fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke="var(--muted)" fontSize={12} width={28} />
                  <Tooltip cursor={{ fill: "var(--sunken)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8 }} />
                  <Bar dataKey="companies" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent companies" action={<Link href="/companies" className="text-sm text-brand hover:underline">View all</Link>} />
          {isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : stats.recent.length === 0 ? (
            <p className="p-5 text-sm text-muted">No companies yet. Create the first one from the Companies page.</p>
          ) : (
            <ul>
              {stats.recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-0">
                  <div className="min-w-0">
                    <Link href={`/companies/${c.id}`} className="block truncate text-sm font-medium hover:underline">{c.name}</Link>
                    <span className="text-xs text-muted">Added {formatDate(c.createdAt)}</span>
                  </div>
                  <StatusBadge active={c.isActive} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className="text-xs text-muted">Branch totals and platform-wide revenue aren&apos;t shown because the backend doesn&apos;t expose them yet.</p>
    </div>
  );
}
