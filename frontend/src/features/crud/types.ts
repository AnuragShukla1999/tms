import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Role } from "@/lib/roles";

export type Option = { value: string; label: string };

export type FieldType =
  | "text" | "email" | "tel" | "password" | "number" | "date" | "datetime"
  | "textarea" | "checkbox" | "select" | "lookup" | "multilookup" | "lines" | "list";

export interface Lookup {
  path: string;
  label: (row: any) => string;
  params?: Record<string, string | number>;
  /** Endpoints that return a plain array and take no query string. */
  noParams?: boolean;
  /** Hide rows that can't be chosen (e.g. only confirmed bookings can go on a trip). */
  filter?: (row: any) => boolean;
}

export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: readonly string[] | Option[];
  lookup?: Lookup;
  /** For type "lines": the fields of one row (e.g. invoice items). */
  lines?: FieldDef[];
  hint?: string;
  placeholder?: string;
  full?: boolean;
  /** Only shown when creating (hidden while editing). */
  createOnly?: boolean;
  /** Only these roles see the field (e.g. a dropdown fed by an admin-only endpoint). */
  roles?: readonly Role[];
}

export interface Col {
  header: string;
  key?: string;
  cell?: (row: any) => ReactNode;
  kind?: "money" | "date" | "datetime" | "pill" | "bool";
}

export interface ActionDef {
  label: string;
  method: "patch" | "post" | "delete";
  url: (row: any, parent?: any) => string;
  when?: (row: any, parent?: any) => boolean;
  confirm?: string;
  /** If set, a small form collects the request body first. */
  fields?: FieldDef[];
  danger?: boolean;
  roles?: readonly Role[];
  done?: string;
}

/** A list that belongs to one record (documents of a vehicle, expenses of a trip...). */
export interface SubDef {
  title: string;
  listUrl: (parent: any) => string;
  pick?: (raw: any) => any[];
  createUrl?: (parent: any) => string;
  fields?: FieldDef[];
  columns: Col[];
  actions?: ActionDef[];
  /** Hide the Add button for some parents (e.g. only draft invoices accept items). */
  canAdd?: (parent: any) => boolean;
}

export interface ResourceConfig {
  key: string;
  title: string;
  singular: string;
  description: string;
  group: string;
  icon: LucideIcon;
  /** Who may open the page (mirrors the controller's @Roles). */
  roles: readonly Role[];
  writeRoles?: readonly Role[];
  path: string;
  paging: "server" | "client";
  searchable?: boolean;
  filters?: { name: string; label: string; options: readonly string[] }[];
  extraParams?: Record<string, string | number>;
  columns: Col[];
  fields: FieldDef[];
  /** `null` = records cannot be edited. Default: `fields` without createOnly ones. */
  editFields?: FieldDef[] | null;
  itemUrl?: (row: any) => string;
  deletable?: boolean;
  deleteLabel?: string;
  deleteWhen?: (row: any) => boolean;
  deleteRoles?: readonly Role[];
  noCreate?: boolean;
  actions?: ActionDef[];
  sub?: SubDef[];
  /** false = no detail view (the list row says it all). */
  detail?: boolean;
}
