"use client";

/**
 * DynamicForm: renders a form from a list of field definitions (see ./types FieldDef),
 * validates it, and calls onSubmit with the JSON body. Used for create/edit forms,
 * row actions that ask for input, and sub-record forms.
 * Helpers live in ./form-values.ts; the individual inputs live in ./field-inputs.tsx.
 */
import { useCallback, useState } from "react";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { FieldInput } from "./field-inputs";
import { buildPayload, toFormValues, validate, type Values } from "./form-values";
import type { FieldDef } from "./types";

export function DynamicForm({ fields: allFields, initial, submitLabel = "Save", busy, error, onSubmit, onCancel }: {
  fields: FieldDef[];
  initial?: any;
  submitLabel?: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (payload: Record<string, unknown>) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const role = useAuthStore((s) => s.user?.role);
  // Some fields are only for certain roles (FieldDef.roles).
  const fields = allFields.filter((f) => !f.roles || (!!role && f.roles.includes(role)));
  const [values, setValues] = useState<Values>(() => toFormValues(fields, initial));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Stable function, so memoised inputs are not re-rendered on every keystroke.
  const setField = useCallback((name: string, v: any) => setValues((s) => ({ ...s, [name]: v })), []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const errs = validate(fields, values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    void onSubmit(buildPayload(fields, values));
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const wide = f.full || f.type === "textarea" || f.type === "lines" || f.type === "multilookup" || f.type === "list";
          return (
            <div key={f.name} className={wide ? "sm:col-span-2" : undefined}>
              <Field label={f.label + (f.required ? " *" : "")} error={errors[f.name]} hint={f.hint}>
                <FieldInput field={f} value={values[f.name]} error={errors[f.name]} onChange={setField} />
              </Field>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
