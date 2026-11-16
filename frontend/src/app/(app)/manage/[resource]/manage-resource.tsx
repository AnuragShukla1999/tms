"use client";

import { ResourcePage } from "@/features/crud/resource-page";
import { RESOURCES } from "@/features/resources";

export function ManageResource({ resourceKey }: { resourceKey: string }) {
  const cfg = RESOURCES[resourceKey];

    if (!cfg) {
    return <div>Resource not found.</div>;
  }
  // `key` makes React start with a clean page (page number, search, filters) per resource.
  return <ResourcePage key={cfg.key} cfg={cfg} />;
}
