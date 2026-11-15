import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/format";
import type { CompanyListItem } from "./types";

export const companyColumns: ColumnDef<CompanyListItem, unknown>[] = [
  {
    accessorKey: "name",
    header: "Company",
    cell: ({ row }) => (
      <div>
        <Link href={`/companies/${row.original.id}`} className="font-medium hover:underline">{row.original.name}</Link>
        {row.original.legalName && <div className="text-xs text-muted">{row.original.legalName}</div>}
      </div>
    ),
  },
  {
    id: "location",
    header: "Location",
    accessorFn: (c) => [c.city, c.state].filter(Boolean).join(", "),
    cell: ({ getValue }) => (getValue() as string) || "—",
  },
  { accessorKey: "gstin", header: "GSTIN", cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string | null) ?? "—"}</span> },
  { id: "users", header: "Users", accessorFn: (c) => c._count.users },
  { id: "vehicles", header: "Vehicles", accessorFn: (c) => c._count.vehicles },
  { id: "drivers", header: "Drivers", accessorFn: (c) => c._count.drivers },
  { id: "customers", header: "Customers", accessorFn: (c) => c._count.customers },
  { accessorKey: "isActive", header: "Status", cell: ({ row }) => <StatusBadge active={row.original.isActive} /> },
  { accessorKey: "createdAt", header: "Created", cell: ({ getValue }) => formatDate(getValue() as string) },
];
