"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGuard } from "@/components/shared/role-guard";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompany } from "@/features/companies/hooks";
import { getErrorMessage } from "@/lib/errors";
import { ROLE_LABEL } from "@/lib/roles";
import { formatDate } from "@/lib/format";

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 break-words">{value || "—"}</dd>
    </div>
  );
}

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: company, isLoading, error, refetch } = useCompany(id);

  const back = (
    <Link href="/companies" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" /> All companies
    </Link>
  );

  let body;
  if (error) body = <Card><ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} /></Card>;
  else if (isLoading) body = <Skeleton className="h-64 w-full" />;
  else if (!company) body = <Card><EmptyState title="Company not found" description="It may have been removed, or the link is wrong." /></Card>;
  else {
    body = (
      <div className="space-y-6">
        <PageHeader title={company.name} description={company.legalName ?? undefined} actions={<StatusBadge active={company.isActive} />} />
        <Card>
          <CardHeader title="Details" />
          <dl className="grid gap-5 p-5 text-sm sm:grid-cols-3">
            <Item label="GSTIN" value={company.gstin} />
            <Item label="PAN" value={company.pan} />
            <Item label="Created" value={formatDate(company.createdAt)} />
            <Item label="Phone" value={company.phone} />
            <Item label="Email" value={company.email} />
            <Item label="Address" value={[company.address, company.city, company.state, company.pincode].filter(Boolean).join(", ")} />
          </dl>
        </Card>

        <Card>
          <CardHeader title={`Users (${company.users.length})`} />
          {company.users.length === 0 ? <EmptyState title="No users" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sunken text-left text-muted"><tr>{["Name", "Email", "Phone", "Role", "Status"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {company.users.map((u) => (
                    <tr key={u.id} className="border-t border-line">
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">{u.phone}</td>
                      <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                      <td className="px-4 py-3"><StatusBadge active={u.isActive} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={`Branches (${company.branches.length})`} />
          {company.branches.length === 0 ? <EmptyState title="No branches yet" description="Branches are created by the company's admin." /> : (
            <ul>
              {company.branches.map((b) => (
                <li key={b.id} className="flex items-center justify-between border-b border-line px-5 py-3 text-sm last:border-0">
                  <span>{b.name} <span className="text-muted">({b.code})</span></span>
                  <StatusBadge active={b.isActive} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <p className="text-xs text-muted">Editing a company or deactivating it needs backend endpoints that don&apos;t exist yet.</p>
      </div>
    );
  }

  return <RoleGuard roles={["SUPER_ADMIN"]}>{back}{body}</RoleGuard>;
}
