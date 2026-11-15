"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { ROLE_LABEL } from "@/lib/roles";
import { useAuthStore } from "@/store/auth.store";
import { OpsDashboard } from "./ops-dashboard";

export function RoleDashboard() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  // The backend has no driver- or customer-facing endpoints yet (every API is limited to
  // ADMIN / MANAGER / DISPATCHER / ACCOUNTANT), so these roles only see their account.
  if (user.role === "DRIVER" || user.role === "CUSTOMER") {
    return (
      <Card>
        <CardHeader title={`Welcome, ${user.name}`} description={`Signed in as ${ROLE_LABEL[user.role]}.`} />
        <p className="p-5 text-sm text-muted">
          Your company&apos;s staff manage {user.role === "DRIVER" ? "trips and expenses" : "bookings and invoices"} for you. A self-service area for this role needs
          its own backend endpoints first.
        </p>
      </Card>
    );
  }

  return <OpsDashboard />;
}
