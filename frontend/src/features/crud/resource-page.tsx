"use client";

/**
 * ResourcePage: one generic "list + search + filters + create/edit + row actions" screen.
 * It is driven entirely by a ResourceConfig (see ./types and features/resources/*), so adding a
 * new module usually means adding a config, not writing a new page.
 *
 * Data flow: config -> listParams() -> useApiList() (React Query) -> SimpleTable.
 * Writes go through useApiMutation(), which refreshes the cached lists afterwards.
 */
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGuard } from "@/components/shared/role-guard";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { canAccess } from "@/lib/access";
import { getErrorMessage } from "@/lib/errors";
import { pretty } from "@/lib/format";
import { normalizeList } from "@/lib/list";
import { useAuthStore } from "@/store/auth.store";
import { ActionButtons } from "./actions";
import { DetailModal } from "./detail";
import { DynamicForm } from "./form";
import { useApiList, useApiMutation } from "./hooks";
import { listParams, PAGE_SIZE } from "./list-params";
import { SimpleTable } from "./table";
import type { ActionDef, ResourceConfig } from "./types";

export function ResourcePage({ cfg }: { cfg: ResourceConfig }) {
  // Backend guard (cfg.roles) AND the role's own page list (lib/access.ts).
  const allowed = cfg.roles.filter((r) => canAccess(r, cfg.key));
  return (
    <RoleGuard roles={allowed}>
      <Inner cfg={cfg} />
    </RoleGuard>
  );
}

function Inner({ cfg }: { cfg: ResourceConfig }) {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = !cfg.writeRoles || (!!role && cfg.writeRoles.includes(role));
  const server = cfg.paging === "server";

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [form, setForm] = useState<{ mode: "create" } | { mode: "edit"; row: any } | null>(null);
  const [viewRow, setViewRow] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useApiMutation();

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const q = useApiList(cfg.path, listParams(cfg, { page, search, filters }));

  const view = useMemo(() => {
    if (server) return normalizeList(q.data, page, PAGE_SIZE);
    const all = normalizeList(q.data, 1, PAGE_SIZE);
    const needle = search.toLowerCase();
    const filtered = needle ? all.rows.filter((r) => JSON.stringify(r).toLowerCase().includes(needle)) : all.rows;
    return {
      ...all,
      rows: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    };
  }, [q.data, server, page, search]);

  const itemUrl = (row: any) => (cfg.itemUrl ? cfg.itemUrl(row) : `${cfg.path}/${row.id}`);
  const editFields = cfg.editFields === undefined ? cfg.fields.filter((f) => !f.createOnly) : cfg.editFields;
  const canEdit = canWrite && editFields !== null;
  const canCreate = canWrite && !cfg.noCreate;

  const actions: ActionDef[] = [
    ...(cfg.actions ?? []).map((a) => ({ ...a, roles: a.roles ?? (cfg.writeRoles ? [...cfg.writeRoles] : undefined) })),
    ...(cfg.deletable
      ? [{
          label: cfg.deleteLabel ?? "Delete",
          method: "delete" as const,
          url: itemUrl,
          danger: true,
          when: cfg.deleteWhen,
          roles: cfg.deleteRoles ? [...cfg.deleteRoles] : cfg.writeRoles ? [...cfg.writeRoles] : undefined,
          confirm: `${cfg.deleteLabel ?? "Delete"} this ${cfg.singular.toLowerCase()}?`,
          done: `${cfg.singular} ${cfg.deleteLabel === "Deactivate" ? "deactivated" : "removed"}`,
        }]
      : []),
  ];

  async function submit(payload: Record<string, unknown>) {
    if (!form) return;
    setFormError(null);
    try {
      if (form.mode === "create") {
        await mutation.mutateAsync({ method: "post", url: cfg.path, data: payload });
        toast.success(`${cfg.singular} created`);
      } else {
        await mutation.mutateAsync({ method: "patch", url: itemUrl(form.row), data: payload });
        toast.success(`${cfg.singular} updated`);
      }
      setForm(null);
    } catch (e) {
      setFormError(getErrorMessage(e));
    }
  }

  const createButton = canCreate ? (
    <Button onClick={() => { setFormError(null); setForm({ mode: "create" }); }}><Plus className="h-4 w-4" /> {`New ${cfg.singular.toLowerCase()}`}</Button>
  ) : undefined;

  return (
    <>
      <PageHeader title={cfg.title} description={cfg.description} actions={createButton} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          {(cfg.searchable || !server) && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input className="pl-9" placeholder={`Search ${cfg.title.toLowerCase()}`} aria-label="Search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </div>
          )}
          {cfg.filters?.map((f) => (
            <Select key={f.name} className="w-44" aria-label={f.label} value={filters[f.name] ?? ""} onChange={(e) => { setFilters((s) => ({ ...s, [f.name]: e.target.value })); setPage(1); }}>
              <option value="">{f.label}: all</option>
              {f.options.map((o) => <option key={o} value={o}>{pretty(o)}</option>)}
            </Select>
          ))}
        </div>

        {q.error ? (
          <ErrorState message={getErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        ) : (
          <SimpleTable
            columns={cfg.columns}
            rows={view.rows}
            loading={q.isLoading}
            emptyTitle={`No ${cfg.title.toLowerCase()} found`}
            emptyDescription={canCreate ? `Create the first ${cfg.singular.toLowerCase()} to get started.` : undefined}
            rowActions={(row) => (
              <div className="flex items-center justify-end gap-0.5">
                {cfg.detail !== false && <Button variant="ghost" size="sm" onClick={() => setViewRow(row)}>View</Button>}
                {canEdit && <Button variant="ghost" size="sm" onClick={() => { setFormError(null); setForm({ mode: "edit", row }); }}>Edit</Button>}
                <ActionButtons actions={actions} row={row} />
              </div>
            )}
          />
        )}

        {!q.isLoading && !q.error && view.total > 0 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
            <span>{view.total} total</span>
            <div className="flex items-center gap-2">
              <span>Page {page} of {view.totalPages}</span>
              <Button variant="outline" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" aria-label="Next page" disabled={page >= view.totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={!!form} title={form?.mode === "edit" ? `Edit ${cfg.singular.toLowerCase()}` : `New ${cfg.singular.toLowerCase()}`} onClose={() => setForm(null)} wide>
        {form && (
          <DynamicForm
            key={form.mode === "edit" ? form.row.id : "new"}
            fields={form.mode === "edit" ? (editFields ?? []) : cfg.fields}
            initial={form.mode === "edit" ? form.row : undefined}
            submitLabel={form.mode === "edit" ? "Save changes" : "Create"}
            busy={mutation.isPending}
            error={formError}
            onSubmit={submit}
            onCancel={() => setForm(null)}
          />
        )}
      </Modal>

      <DetailModal cfg={cfg} row={viewRow} onClose={() => setViewRow(null)} />
    </>
  );
}
