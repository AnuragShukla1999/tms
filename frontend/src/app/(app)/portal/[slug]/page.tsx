"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGuard } from "@/components/shared/role-guard";
import { AwaitingBackend } from "@/components/shared/states";
import { Card } from "@/components/ui/card";
import { PORTAL_PAGES } from "@/lib/access";

/** Self-service pages for DRIVER and CUSTOMER. The backend has no endpoints for them yet. */
export default function PortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const owner = (["DRIVER", "CUSTOMER"] as const).find((r) => PORTAL_PAGES[r].some((p) => p.slug === slug));
  if (!owner) notFound();
  const page = PORTAL_PAGES[owner].find((p) => p.slug === slug)!;
  return (
    <RoleGuard roles={[owner]}>
      <PageHeader title={page.title} description={page.description} />
      <Card>
        <AwaitingBackend title={page.title} endpoints={page.endpoints} />
      </Card>
    </RoleGuard>
  );
}
