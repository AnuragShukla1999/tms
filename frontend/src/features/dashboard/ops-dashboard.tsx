"use client";

import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorState } from "@/components/shared/states";
import { useApiList } from "@/features/crud/hooks";
import { SimpleTable } from "@/features/crud/table";
import type { Col } from "@/features/crud/types";
import { FIN, MGMT, OPS } from "@/features/resources/shared";
import { canAccess } from "@/lib/access";
import { getErrorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { normalizeList } from "@/lib/list";
import type { Role } from "@/lib/roles";
import { useAuthStore } from "@/store/auth.store";

function CountCard({ label, url, params }: { label: string; url: string; params?: Record<string, unknown> }) {
  const q = useApiList(url, params);
  return <StatCard label={label} loading={q.isLoading} value={q.error ? "—" : normalizeList(q.data, 1, 1).total} />;
}

function Outstanding() {
  const q = useApiList("/ledger/summary", { partyType: "CUSTOMER" });
  return <StatCard label="Customer outstanding" loading={q.isLoading} value={q.error ? "—" : formatMoney((q.data as any)?.totalOutstanding)} />;
}

const ADMIN: readonly Role[] = ["ADMIN"];

// Each card calls the same list endpoint as its page and reads the total, limited to roles the backend allows.
const COUNTS: { label: string; url: string; roles: readonly Role[]; page: string; params?: Record<string, unknown> }[] = [
  { label: "Pending bookings", url: "/bookings", page: "bookings", roles: OPS, params: { limit: 1, status: "PENDING" } },
  { label: "Trips in transit", url: "/trips", page: "trips", roles: OPS, params: { limit: 1, status: "IN_TRANSIT" } },
  { label: "Total bookings", url: "/bookings", page: "bookings", roles: OPS, params: { limit: 1 } },
  { label: "Customers", url: "/customers", page: "customers", roles: OPS, params: { limit: 1 } },
  { label: "Vehicles", url: "/vehicles", page: "vehicles", roles: MGMT },
  { label: "Drivers", url: "/drivers", page: "drivers", roles: OPS, params: { limit: 1 } },
  { label: "Employees", url: "/users", page: "employees", roles: ADMIN, params: { limit: 1 } },
  { label: "Branches", url: "/branches", page: "branches", roles: ADMIN, params: { limit: 1 } },
  { label: "Unpaid invoices", url: "/invoices", page: "invoices", roles: FIN, params: { limit: 1, status: "ISSUED" } },
];

const bookingCols: Col[] = [
  { header: "Booking", key: "bookingNo" }, { header: "Customer", key: "customer.name" },
  { header: "Route", cell: (r) => `${r.pickupCity} → ${r.dropCity}` }, { header: "Status", key: "status", kind: "pill" },
  { header: "Total", key: "totalAmount", kind: "money" },
];

const tripCols: Col[] = [
  { header: "Trip", key: "tripNo" }, { header: "Route", cell: (r) => `${r.originCity} → ${r.destCity}` },
  { header: "Vehicle", cell: (r) => r.vehicle?.registrationNo ?? "—" }, { header: "Driver", cell: (r) => r.driver?.name ?? "—" },
  { header: "Status", key: "status", kind: "pill" },
];

function ListCard({ title, href, url, params, columns, empty }: {
  title: string; href: string; url: string; params: Record<string, unknown>; columns: Col[]; empty: string;
}) {
  const q = useApiList(url, params);
  return (
    <Card>
      <CardHeader title={title} action={<Link href={href} className="text-sm text-brand hover:underline">View all</Link>} />
      {q.error ? (
        <ErrorState message={getErrorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <SimpleTable columns={columns} rows={normalizeList(q.data, 1, 5).rows} loading={q.isLoading} emptyTitle={empty} />
      )}
    </Card>
  );
}

export function OpsDashboard() {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {COUNTS.filter((c) => c.roles.includes(role) && canAccess(role, c.page)).map((c) => <CountCard key={c.label} label={c.label} url={c.url} params={c.params} />)}
        {FIN.includes(role) && canAccess(role, "ledger") && <Outstanding />}
      </div>
      {OPS.includes(role) && canAccess(role, "bookings") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ListCard title="Recent bookings" href="/manage/bookings" url="/bookings" params={{ limit: 5 }} columns={bookingCols} empty="No bookings yet" />
          <ListCard title="Trips in transit" href="/manage/trips" url="/trips" params={{ limit: 5, status: "IN_TRANSIT" }} columns={tripCols} empty="No trips in transit" />
        </div>
      )}
    </div>
  );
}
