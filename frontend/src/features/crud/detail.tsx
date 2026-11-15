"use client";

/**
 * The "View" popup of a resource: shows the record (Overview) plus any sub-lists the config
 * defines (e.g. a vehicle's documents, a trip's expenses) with their own Add / action buttons.
 */
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatMoney, ISO_RE, pretty } from "@/lib/format";
import { normalizeList, unwrap } from "@/lib/list";
import { useAuthStore } from "@/store/auth.store";
import { ActionButtons } from "./actions";
import { DynamicForm } from "./form";
import { useApiList, useApiMutation } from "./hooks";
import { SimpleTable } from "./table";
import type { ResourceConfig, SubDef } from "./types";

const HIDDEN = new Set(["id", "companyId", "passwordHash", "updatedAt"]);
const MONEY_HINT = /(amount|charges|salary|rate|cost|balance|limit|total|subtotal|discount|cgst|sgst|igst|profit|revenue|expense|freight|advance|value|price|fee)/i;

function display(key: string, v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && ISO_RE.test(v) && v.length > 9) return formatDateTime(v).replace(/, 12:00 am$/i, "");
  if ((typeof v === "number" || (typeof v === "string" && v !== "" && !Number.isNaN(Number(v)))) && MONEY_HINT.test(key) && !/(no|id|pincode|phone)$/i.test(key)) return formatMoney(v);
  if (typeof v === "string" && /^[A-Z_]{3,}$/.test(v)) return pretty(v);
  return String(v);
}

export function Overview({ data }: { data: any }) {
  const entries: [string, string][] = [];
  for (const [k, v] of Object.entries(data ?? {})) {
    if (HIDDEN.has(k) || v === null || v === undefined || v === "") continue;
    if (typeof v === "object") {
      const name = (v as any)?.name;
      if (!Array.isArray(v) && name) entries.push([k, String(name)]);
      continue;
    }
    entries.push([k, display(k, v)]);
  }
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted">{pretty(k)}</dt>
          <dd className="mt-0.5 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function SubSection({ def, parent, canWrite }: { def: SubDef; parent: any; canWrite: boolean }) {
  const q = useApiList(def.listUrl(parent));
  const mutation = useApiMutation();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = def.pick ? def.pick(q.data) : normalizeList(q.data, 1, 100).rows;

  async function create(payload: Record<string, unknown>) {
    setError(null);
    try {
      await mutation.mutateAsync({ method: "post", url: def.createUrl!(parent), data: payload });
      toast.success("Added");
      setAdding(false);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{def.title}</h3>
        {def.createUrl && def.fields && canWrite && !adding && (!def.canAdd || def.canAdd(parent)) && (
          <Button size="sm" variant="outline" onClick={() => { setError(null); setAdding(true); }}><Plus className="h-3.5 w-3.5" /> Add</Button>
        )}
      </div>
      {adding && def.fields && (
        <div className="mb-4 rounded-md border border-line p-4">
          <DynamicForm fields={def.fields} submitLabel="Add" busy={mutation.isPending} error={error} onSubmit={create} onCancel={() => setAdding(false)} />
        </div>
      )}
      <div className="rounded-md border border-line">
        {q.error ? (
          <p className="p-4 text-sm text-danger">{getErrorMessage(q.error)}</p>
        ) : (
          <SimpleTable
            columns={def.columns}
            rows={rows}
            loading={q.isLoading}
            emptyTitle={`No ${def.title.toLowerCase()}`}
            rowActions={def.actions && canWrite ? (row) => <ActionButtons actions={def.actions!} row={row} parent={parent} /> : undefined}
          />
        )}
      </div>
    </section>
  );
}

export function DetailModal({ cfg, row, onClose }: { cfg: ResourceConfig; row: any | null; onClose: () => void }) {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = !cfg.writeRoles || (!!role && cfg.writeRoles.includes(role));
  const itemUrl = row ? (cfg.itemUrl ? cfg.itemUrl(row) : `${cfg.path}/${row.id}`) : "";
  const q = useApiList(itemUrl, undefined, !!row && cfg.detail !== false);
  const full = row ? { ...row, ...(q.data ? unwrap(q.data) : {}) } : null;

  return (
    <Modal open={!!row} title={`${cfg.singular} details`} onClose={onClose} wide>
      {full && (
        <>
          {q.isLoading ? <Skeleton className="h-24 w-full" /> : <Overview data={full} />}
          {cfg.sub?.map((s) => <SubSection key={s.title} def={s} parent={full} canWrite={canWrite} />)}
        </>
      )}
    </Modal>
  );
}
