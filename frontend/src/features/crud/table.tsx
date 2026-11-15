/**
 * SimpleTable: the plain table used by every resource list, sub-list and dashboard card.
 * renderCell() decides how a value is shown from the column's `kind` (money, date, pill...).
 */
import type { ReactNode } from "react";
import { Pill } from "@/components/shared/pill";
import { EmptyState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateTime, formatMoney, getPath } from "@/lib/format";
import type { Col } from "./types";

export function renderCell(col: Col, row: any): ReactNode {
  if (col.cell) return col.cell(row);
  const v = col.key ? getPath(row, col.key) : undefined;
  switch (col.kind) {
    case "money": return formatMoney(v);
    case "date": return formatDate(v as string);
    case "datetime": return formatDateTime(v);
    case "pill": case "bool": return <Pill value={v} labels={col.kind === "bool" ? ["Active", "Inactive"] : undefined} />;
    default: return v === null || v === undefined || v === "" ? <span className="text-muted">—</span> : String(v);
  }
}

export function SimpleTable({ columns, rows, loading, rowActions, emptyTitle = "Nothing here yet", emptyDescription }: {
  columns: Col[];
  rows: any[];
  loading?: boolean;
  rowActions?: (row: any) => ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (loading) return <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-sunken text-left text-muted">
          <tr>
            {columns.map((c) => <th key={c.header} className="whitespace-nowrap px-4 py-2.5 font-medium">{c.header}</th>)}
            {rowActions && <th className="px-4 py-2.5 text-right font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-t border-line hover:bg-sunken/50">
              {columns.map((c) => <td key={c.header} className="px-4 py-3 align-top">{renderCell(c, row)}</td>)}
              {rowActions && <td className="whitespace-nowrap px-4 py-2 text-right">{rowActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
