"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { getErrorMessage } from "@/lib/errors";
import { useAuthStore } from "@/store/auth.store";
import { DynamicForm } from "./form";
import { useApiMutation } from "./hooks";
import type { ActionDef } from "./types";

/** Row buttons for custom API actions (issue, cancel, activate...). Some ask for input first. */
export function ActionButtons({ actions, row, parent }: { actions: ActionDef[]; row: any; parent?: any }) {
  const role = useAuthStore((s) => s.user?.role);
  const mutation = useApiMutation();
  const [pending, setPending] = useState<ActionDef | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = actions.filter((a) => (!a.when || a.when(row, parent)) && (!a.roles || (role && a.roles.includes(role))));
  if (visible.length === 0) return null;

  async function run(a: ActionDef, body?: unknown) {
    setError(null);
    try {
      await mutation.mutateAsync({ method: a.method, url: a.url(row, parent), data: body });
      toast.success(a.done ?? `${a.label} done`);
      setPending(null);
    } catch (e) {
      if (a.fields) setError(getErrorMessage(e));
      else toast.error(getErrorMessage(e));
    }
  }

  function click(a: ActionDef) {
    if (a.fields) { setError(null); setPending(a); return; }
    if (a.confirm && !window.confirm(a.confirm)) return;
    void run(a);
  }

  return (
    <>
      {visible.map((a) => (
        <Button key={a.label} variant="ghost" size="sm" className={a.danger ? "text-danger" : undefined} disabled={mutation.isPending} onClick={() => click(a)}>
          {a.label}
        </Button>
      ))}
      <Modal open={!!pending} title={pending?.label ?? ""} onClose={() => setPending(null)}>
        {pending?.fields && (
          <DynamicForm fields={pending.fields} submitLabel={pending.label} busy={mutation.isPending} error={error} onSubmit={(p) => run(pending, p)} onCancel={() => setPending(null)} />
        )}
      </Modal>
    </>
  );
}
