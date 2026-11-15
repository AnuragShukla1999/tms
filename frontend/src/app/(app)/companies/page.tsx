"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGuard } from "@/components/shared/role-guard";
import { ErrorState } from "@/components/shared/states";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { companyColumns } from "@/features/companies/company-columns";
import { useCompanies } from "@/features/companies/hooks";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const newLink = (
  <Link href="/companies/new" className={cn(buttonVariants())}><Plus className="h-4 w-4" /> New company</Link>
);

export default function CompaniesPage() {
  const { data, isLoading, error, refetch } = useCompanies();

  return (
    <RoleGuard roles={["SUPER_ADMIN"]}>
      <PageHeader title="Companies" description="Every transport company on the platform." actions={newLink} />
      <Card>
        {error ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : (
          <DataTable
            columns={companyColumns}
            data={data ?? []}
            loading={isLoading}
            searchPlaceholder="Search companies"
            emptyTitle="No companies yet"
            emptyDescription="Create a company together with its first admin so they can sign in."
            emptyAction={newLink}
          />
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Search, sorting and paging run in your browser because the API returns all companies at once.</p>
    </RoleGuard>
  );
}
