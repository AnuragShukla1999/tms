/**
 * The registry of every "manage" page. Each file below exports ResourceConfig objects
 * (columns, form fields, row actions, who may open it) that the generic ResourcePage renders.
 *
 *   master.tsx      branches, employees, customers, vendors
 *   fleet.tsx       vehicles, drivers, driver assignments, tyres
 *   operations.tsx  bookings, trips, lorry receipts, e-way bills, PODs, fuel
 *   pricing.tsx     routes, rate cards, quotations
 *   finance.tsx     invoices, payments, driver transactions, office expenses
 *
 * The sidebar (lib/nav.ts), the breadcrumbs and /manage/[resource] all read from here.
 */
import type { ResourceConfig } from "../crud/types";
import { FINANCE } from "./finance";
import { FLEET } from "./fleet";
import { MASTER } from "./master";
import { OPERATIONS } from "./operations";
import { PRICING } from "./pricing";

export const RESOURCE_LIST: ResourceConfig[] = [...MASTER, ...FLEET, ...OPERATIONS, ...PRICING, ...FINANCE];
export const RESOURCES: Record<string, ResourceConfig> = Object.fromEntries(RESOURCE_LIST.map((r) => [r.key, r]));
