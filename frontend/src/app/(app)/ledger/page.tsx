"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGuard } from "@/components/shared/role-guard";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/shared/field";
import { Overview } from "@/features/crud/detail";
import { DynamicForm } from "@/features/crud/form";
import { useApiList, useApiMutation } from "@/features/crud/hooks";
import { SimpleTable } from "@/features/crud/table";
import { customerLookup, driverLookup, FIN, MGMT, vendorLookup } from "@/features/resources/shared";
import { canAccess } from "@/lib/access";
import { getErrorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { normalizeList, unwrap } from "@/lib/list";
import { useAuthStore } from "@/store/auth.store";
import type { Col } from "@/features/crud/types";

type PartyType = "CUSTOMER" | "VENDOR" | "DRIVER";
const TABS: { type: PartyType; label: string; lookup: typeof customerLookup }[] = [
  { type: "CUSTOMER", label: "Customers", lookup: customerLookup },
  { type: "VENDOR", label: "Vendors", lookup: vendorLookup },
  { type: "DRIVER", label: "Drivers", lookup: driverLookup },
];

const summaryCols: Col[] = [
  { header: "Name", key: "name" }, { header: "Opening", key: "openingBalance", kind: "money" },
  { header: "Debit", key: "totalDebit", kind: "money" }, { header: "Credit", key: "totalCredit", kind: "money" },
  { header: "Balance", key: "balance", kind: "money" },
];

const entryCols: Col[] = [
  { header: "Date", key: "entryDate", kind: "date" }, { header: "Type", key: "entryType", kind: "pill" },
  { header: "Description", key: "description" }, { header: "Amount", key: "amount", kind: "money" },
  { header: "Balance", key: "balance", kind: "money" },
];

function Statement({ type, partyId, onClose }: { type: PartyType; partyId: string | null; onClose: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = useApiList(`/ledger/${type}/${partyId}`, { from, to }, !!partyId);
  const d = q.data as any;
  return (
    <Modal open={!!partyId} title={d?.party?.name ? `Statement · ${d.party.name}` : "Statement"} onClose={onClose} wide>
      <div className="mb-4 flex flex-wrap gap-3">
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {q.error ? <ErrorState message={getErrorMessage(q.error)} /> : q.isLoading ? <Skeleton className="h-32 w-full" /> : d && (
        <>
          <dl className="mb-3 grid gap-3 text-sm sm:grid-cols-4">
            {([["Opening", d.openingBalance], ["Debit", d.totalDebit], ["Credit", d.totalCredit], ["Closing", d.closingBalance]] as const).map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 font-medium">{formatMoney(v)}</dd></div>
            ))}
          </dl>
          {d.balanceNote && <p className="mb-3 text-xs text-muted">{d.balanceNote}</p>}
          <div className="rounded-md border border-line"><SimpleTable columns={entryCols} rows={d.entries ?? []} emptyTitle="No entries in this period" /></div>
        </>
      )}
    </Modal>
  );
}

function SalarySummary() {
  const [driverId, setDriverId] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const drivers = useApiList("/drivers", { limit: 100 });
  const q = useApiList(`/driver-transactions/salary-summary/${driverId}`, { month }, !!driverId && /^\d{4}-\d{2}$/.test(month));
  return (
    <Card className="mt-6 p-5">
      <h2 className="mb-3 text-sm font-semibold">Driver salary summary</h2>
      <div className="mb-4 flex flex-wrap gap-3">
        <Field label="Driver">
          <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Select…</option>
            {normalizeList(drivers.data, 1, 100).rows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
        <Field label="Month"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
      </div>
      {q.error ? <p className="text-sm text-danger">{getErrorMessage(q.error)}</p> : q.isLoading ? <Skeleton className="h-16 w-full" /> : q.data ? <Overview data={flatten(unwrap(q.data))} /> : <p className="text-sm text-muted">Pick a driver and month.</p>}
    </Card>
  );
}

/** Flattens one nested level (e.g. `totals.SALARY`) so Overview can show it. */
function flatten(o: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o ?? {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) { if (typeof v2 !== "object") out[`${k} ${k2}`] = v2; }
    else out[k] = v;
  }
  return out;
}

function LedgerInner() {
  const role = useAuthStore((s) => s.user?.role);
  const [tab, setTab] = useState<PartyType>("CUSTOMER");
  const [onlyOutstanding, setOnlyOutstanding] = useState(true);
  const [statementFor, setStatementFor] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useApiMutation();
  const current = TABS.find((t) => t.type === tab)!;
  const q = useApiList("/ledger/summary", { partyType: tab, onlyOutstanding: onlyOutstanding ? "true" : undefined });
  const raw = q.data as any;
  const rows = normalizeList(raw, 1, 1000).rows;

  async function adjust(payload: Record<string, unknown>) {
    setFormError(null);
    try {
      await mutation.mutateAsync({ method: "post", url: "/ledger/adjustments", data: { ...payload, partyType: tab } });
      toast.success("Adjustment posted");
      setAdjusting(false);
    } catch (e) {
      setFormError(getErrorMessage(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Ledger"
        description="Outstanding balances and statements."
        actions={role && MGMT.includes(role) ? <Button onClick={() => { setFormError(null); setAdjusting(true); }}><Plus className="h-4 w-4" /> Adjustment</Button> : undefined}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Button key={t.type} variant={tab === t.type ? "primary" : "outline"} size="sm" onClick={() => setTab(t.type)}>{t.label}</Button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyOutstanding} onChange={(e) => setOnlyOutstanding(e.target.checked)} /> Only with a balance
        </label>
      </div>
      <Card>
        {q.error ? <ErrorState message={getErrorMessage(q.error)} onRetry={() => void q.refetch()} /> : (
          <>
            <div className="flex items-center justify-between border-b border-line px-4 py-3 text-sm">
              <span className="text-muted">{raw?.nature ?? "Total outstanding"}</span>
              <span className="text-lg font-semibold tabular-nums">{formatMoney(raw?.totalOutstanding)}</span>
            </div>
            <SimpleTable
              columns={summaryCols}
              rows={rows}
              loading={q.isLoading}
              emptyTitle="No balances"
              rowActions={(row) => <Button variant="ghost" size="sm" onClick={() => setStatementFor(row.partyId)}>Statement</Button>}
            />
          </>
        )}
      </Card>
      {tab === "DRIVER" && <SalarySummary />}

      <Statement key={`${tab}-${statementFor}`} type={tab} partyId={statementFor} onClose={() => setStatementFor(null)} />
      <Modal open={adjusting} title="Ledger adjustment" onClose={() => setAdjusting(false)}>
        <DynamicForm
          fields={[
            { name: "partyId", label: current.label.replace(/s$/, ""), type: "lookup", lookup: current.lookup, required: true },
            { name: "entryType", label: "Entry type", type: "select", options: ["DEBIT", "CREDIT"], required: true },
            { name: "amount", label: "Amount (₹)", type: "number", required: true },
            { name: "entryDate", label: "Date", type: "date" },
            { name: "description", label: "Description", type: "textarea", required: true },
          ]}
          submitLabel="Post adjustment"
          busy={mutation.isPending}
          error={formError}
          onSubmit={adjust}
          onCancel={() => setAdjusting(false)}
        />
      </Modal>
    </>
  );
}

export default function LedgerPage() {
  return <RoleGuard roles={FIN.filter((r) => canAccess(r, "ledger"))}><LedgerInner /></RoleGuard>;
}
