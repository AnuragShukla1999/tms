/**
 * Pure helpers (no React) that sit between the API and the form:
 *   toFormValues -> turns a record from the API into the strings/booleans that inputs need
 *   validate     -> checks required fields and returns { fieldName: "message" }
 *   buildPayload -> turns the form values back into the JSON body the API expects
 */
import type { FieldDef } from "./types";

export type Values = Record<string, any>;

function toLocalInput(v: unknown): string {
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Turns a record from the API into the string/boolean values the form inputs use. */
export function toFormValues(fields: FieldDef[], row?: any): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = row?.[f.name];
    switch (f.type) {
      case "checkbox":
        out[f.name] = v ?? f.name === "isActive";
        break;
      case "date":
        out[f.name] = v ? String(v).slice(0, 10) : "";
        break;
      case "datetime":
        out[f.name] = v ? toLocalInput(v) : "";
        break;
      case "multilookup":
        out[f.name] = Array.isArray(v) ? v : [];
        break;
      case "list":
        out[f.name] = Array.isArray(v) ? v.join(", ") : "";
        break;
      case "lines":
        out[f.name] = Array.isArray(v) ? v.map((l) => toFormValues(f.lines ?? [], l)) : [];
        break;
      default:
        out[f.name] = v === null || v === undefined ? "" : String(v);
    }
  }
  return out;
}

/** Builds the request body: empty fields are omitted (the API rejects "" for optional fields). */
export function buildPayload(fields: FieldDef[], values: Values): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    switch (f.type) {
      case "checkbox":
        out[f.name] = Boolean(v);
        break;
      case "number":
        if (v !== "" && v !== undefined) out[f.name] = Number(v);
        break;
      case "datetime":
        if (v) out[f.name] = new Date(v).toISOString();
        break;
      case "multilookup":
        if (Array.isArray(v) && v.length) out[f.name] = v;
        break;
      case "list": {
        const items = String(v ?? "")
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (items.length) out[f.name] = items;
        break;
      }
      case "lines": {
        const rows = (v as Values[] | undefined) ?? [];
        if (rows.length) out[f.name] = rows.map((r) => buildPayload(f.lines ?? [], r));
        break;
      }
      default: {
        const s = typeof v === "string" ? v.trim() : v;
        if (s !== "" && s !== undefined && s !== null) out[f.name] = s;
      }
    }
  }
  return out;
}

/** Returns an error message per invalid field name (empty object = valid). */
export function validate(fields: FieldDef[], values: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = values[f.name];
    const empty = v === "" || v === undefined || v === null || (Array.isArray(v) && v.length === 0);
    if (f.required && f.type !== "checkbox" && empty) errors[f.name] = `${f.label} is required`;
    if (f.type === "lines" && Array.isArray(v)) {
      for (const line of v as Values[]) {
        const sub = validate(f.lines ?? [], line);
        if (Object.keys(sub).length) {
          errors[f.name] = "Fill in the required fields on every line";
          break;
        }
      }
    }
  }
  return errors;
}
