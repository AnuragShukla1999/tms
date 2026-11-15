import { notFound } from "next/navigation";
import { RESOURCE_LIST, RESOURCES } from "@/features/resources";
import { ManageResource } from "./manage-resource";

// One page is pre-built for every resource key (customers, trips, invoices...).
// That lets Next.js prefetch them, so sidebar clicks do not wait for the server.
export const dynamicParams = false;

export function generateStaticParams() {
  return RESOURCE_LIST.map((r) => ({ resource: r.key }));
}

export default async function ManagePage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!RESOURCES[resource]) notFound();
  // Only the key crosses to the client: the resource config contains functions and icons.
  return <ManageResource resourceKey={resource} />;
}
