"use client";

/**
 * The individual inputs used by DynamicForm. One <FieldInput> renders the right control
 * (text, select, checkbox, lookup dropdown, repeating lines...) for a field definition.
 *
 * FieldInput is wrapped in memo() so typing in one field does not re-render every other
 * field (the lookup dropdowns can hold 100 options each, which made typing feel laggy).
 */
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { pretty } from "@/lib/format";
import { normalizeList } from "@/lib/list";
import { toFormValues, type Values } from "./form-values";
import { useApiList } from "./hooks";
import type { FieldDef, Option } from "./types";

/** Called with the field's name and its new value. */
export type ChangeHandler = (name: string, value: any) => void;

function toOptions(options: FieldDef["options"]): Option[] {
  return (options ?? []).map((o) => (typeof o === "string" ? { value: o, label: pretty(o) } : o));
}

/** Dropdown (or checkbox list) whose choices come from an API list endpoint. */
function LookupInput({ field, value, onChange, invalid }: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
  invalid: boolean;
}) {
  const l = field.lookup!;
  const q = useApiList(l.path, l.noParams ? undefined : { limit: 100, ...l.params });
  const options = useMemo(
    () =>
      normalizeList(q.data, 1, 100)
        .rows.filter(l.filter ?? (() => true))
        .map((r) => ({ value: r.id as string, label: l.label(r) })),
    [q.data, l],
  );

  if (field.type === "multilookup") {
    const selected: string[] = value ?? [];
    return (
      <div className="max-h-40 overflow-y-auto rounded-md border border-line p-2">
        {q.isLoading && <p className="px-1 text-sm text-muted">Loading…</p>}
        {!q.isLoading && options.length === 0 && <p className="px-1 text-sm text-muted">Nothing to choose from.</p>}
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-sunken">
            <input
              type="checkbox"
              checked={selected.includes(o.value)}
              onChange={(e) => onChange(e.target.checked ? [...selected, o.value] : selected.filter((x) => x !== o.value))}
            />
            {o.label}
          </label>
        ))}
      </div>
    );
  }

  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} disabled={q.isLoading}>
      <option value="">{q.isLoading ? "Loading…" : "Select…"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

/** Picks the right control for `field.type`. */
export const FieldInput = memo(function FieldInput({ field, value, onChange, error }: {
  field: FieldDef;
  value: any;
  onChange: ChangeHandler;
  error?: string;
}) {
  const invalid = !!error;
  const [showPassword, setShowPassword] = useState(false);
  const change = (v: any) => onChange(field.name, v);

  switch (field.type) {
    case "textarea":
      return <Textarea value={value ?? ""} onChange={(e) => change(e.target.value)} placeholder={field.placeholder} aria-invalid={invalid} />;

    case "list":
      return (
        <Textarea
          value={value ?? ""}
          onChange={(e) => change(e.target.value)}
          placeholder={field.placeholder ?? "One per line or comma separated"}
          aria-invalid={invalid}
        />
      );

    case "select":
      return (
        <Select value={value ?? ""} onChange={(e) => change(e.target.value)} aria-invalid={invalid}>
          <option value="">Select…</option>
          {toOptions(field.options).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );

    case "lookup":
    case "multilookup":
      return <LookupInput field={field} value={value} onChange={change} invalid={invalid} />;

    case "checkbox":
      return (
        <span className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" checked={!!value} onChange={(e) => change(e.target.checked)} /> {field.placeholder ?? "Yes"}
        </span>
      );

    case "lines":
      return <LinesInput field={field} value={value ?? []} onChange={change} />;

    // text, email, tel, number, date, datetime and password all use a normal <input>.
    default: {
      const isPassword = field.type === "password";
      const type = isPassword ? (showPassword ? "text" : "password") : field.type === "datetime" ? "datetime-local" : (field.type ?? "text");

      return (
        <div className="relative">
          <Input
            type={type}
            step={field.type === "number" ? "any" : undefined}
            value={value ?? ""}
            onChange={(e) => change(e.target.value)}
            placeholder={field.placeholder}
            aria-invalid={invalid}
            autoComplete={isPassword ? "new-password" : "off"}
            className={isPassword ? "pr-10" : undefined}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      );
    }
  }
});

/** A repeating group of fields, e.g. the items of a booking or invoice. */
function LinesInput({ field, value, onChange }: { field: FieldDef; value: Values[]; onChange: (v: Values[]) => void }) {
  const sub = field.lines ?? [];
  return (
    <div className="space-y-3">
      {value.map((line, i) => (
        <div key={i} className="rounded-md border border-line p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {sub.map((sf) => (
              <Field key={sf.name} label={sf.label + (sf.required ? " *" : "")}>
                <FieldInput
                  field={sf}
                  value={line[sf.name]}
                  onChange={(name, v) => onChange(value.map((l, j) => (j === i ? { ...l, [name]: v } : l)))}
                />
              </Field>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2 text-danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, toFormValues(sub)])}>
        <Plus className="h-3.5 w-3.5" /> Add {field.label.toLowerCase().replace(/s$/, "")}
      </Button>
    </div>
  );
}
