import type { Role } from "./roles";

/**
 * Pages each role may open, by resource key (see features/resources) plus the special
 * keys "ledger", "companies" and "profile".
 *
 * This is the product-level view of each role's job. It is always intersected with the
 * module registry's `roles` (which mirrors the backend's @Roles() guards), so the UI can
 * narrow access but never promise a page the API would answer with 403.
 */
export const ROLE_ACCESS: Record<Role, readonly string[]> = {
  // Platform owner: tenants only, no day-to-day operations.
  SUPER_ADMIN: ["companies"],

  // Company owner: everything inside their company.
  ADMIN: [
    "branches", "employees", "customers", "vendors",
    "vehicles", "drivers", "assignments", "tyres",
    "bookings", "trips", "lorry-receipts", "eway-bills", "pods", "fuel-entries",
    "routes", "rate-cards", "quotations",
    "invoices", "customer-payments", "vendor-payments", "driver-transactions", "office-expenses", "ledger",
  ],

  // Runs operations and the fleet; reads finance for oversight.
  MANAGER: [
    "customers", "vendors",
    "vehicles", "drivers", "assignments", "tyres",
    "bookings", "trips", "lorry-receipts", "eway-bills", "pods", "fuel-entries",
    "routes", "rate-cards", "quotations",
    "invoices", "customer-payments", "office-expenses", "ledger",
  ],

  // Day-to-day planning: bookings, trips, documents, driver/vehicle allocation. No money.
  DISPATCHER: [
    "customers",
    "vehicles", "drivers", "assignments",
    "bookings", "trips", "lorry-receipts", "eway-bills", "pods", "fuel-entries",
    "routes", "quotations",
  ],

  // Money only: billing, collections, payouts, expenses, ledgers, plus customers/vendors as parties.
  ACCOUNTANT: [
    "customers", "vendors",
    "invoices", "customer-payments", "vendor-payments", "driver-transactions", "office-expenses", "ledger",
  ],

  // Self-service roles: nothing from the company-wide registry.
  DRIVER: [],
  CUSTOMER: [],
};

/** Pages for DRIVER and CUSTOMER. The backend has no endpoints for them yet, so these open an explanatory placeholder. */
export const PORTAL_PAGES: Record<"DRIVER" | "CUSTOMER", { slug: string; title: string; description: string; endpoints: string[] }[]> = {
  DRIVER: [
    { slug: "my-trips", title: "My trips", description: "Trips assigned to you.", endpoints: ["GET /trips/my", "PATCH /trips/:id/status"] },
    { slug: "my-expenses", title: "Trip expenses", description: "Fuel, toll and other expenses on your trips.", endpoints: ["GET, POST /trips/my/expenses"] },
    { slug: "my-documents", title: "My documents", description: "Licence and vehicle documents.", endpoints: ["GET /drivers/me/documents"] },
  ],
  CUSTOMER: [
    { slug: "my-bookings", title: "My bookings", description: "Track your consignments.", endpoints: ["GET /bookings/my", "POST /bookings"] },
    { slug: "my-quotations", title: "My quotations", description: "Quotes sent to you.", endpoints: ["GET /quotations/my", "PATCH /quotations/:id"] },
    { slug: "my-invoices", title: "My invoices", description: "Invoices and balances due.", endpoints: ["GET /invoices/my"] },
    { slug: "my-payments", title: "My payments", description: "Payments you have made.", endpoints: ["GET /payments/my"] },
  ],
};

export function canAccess(role: Role | undefined, key: string): boolean {
  return !!role && ROLE_ACCESS[role].includes(key);
}
