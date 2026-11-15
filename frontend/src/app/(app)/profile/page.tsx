"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authService } from "@/features/auth/auth.service";
import { getErrorMessage } from "@/lib/errors";
import { ROLE_LABEL } from "@/lib/roles";
import { formatDate } from "@/lib/format";

export default function ProfilePage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["auth", "profile"], queryFn: authService.profile });

  return (
    <>
      <PageHeader title="Profile" />
      <Card>
        {error ? <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} /> : isLoading || !data ? (
          <div className="space-y-3 p-5"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-5 w-1/4" /></div>
        ) : (
          <dl className="grid gap-5 p-5 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Name</dt><dd className="mt-0.5">{data.name}</dd></div>
            <div><dt className="text-muted">Role</dt><dd className="mt-0.5">{ROLE_LABEL[data.role]}</dd></div>
            <div><dt className="text-muted">Email</dt><dd className="mt-0.5">{data.email ?? "—"}</dd></div>
            <div><dt className="text-muted">Phone</dt><dd className="mt-0.5">{data.phone}</dd></div>
            <div><dt className="text-muted">Status</dt><dd className="mt-0.5"><StatusBadge active={data.isActive} /></dd></div>
            <div><dt className="text-muted">Member since</dt><dd className="mt-0.5">{formatDate(data.createdAt)}</dd></div>
          </dl>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Profile editing and password change need backend endpoints that don&apos;t exist yet.</p>
    </>
  );
}
