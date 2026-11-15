import { FileText, Percent, Route as RouteIcon } from "lucide-react";
import type { ResourceConfig } from "../crud/types";
import { customerLookup, OPS, QuotationStatus, RateType, routeLookup, VehicleType } from "./shared";

const routeFields = [
  { name: "name", label: "Name (optional)" },
  { name: "originCity", label: "Origin city", required: true },
  { name: "originState", label: "Origin state" },
  { name: "destCity", label: "Destination city", required: true },
  { name: "destState", label: "Destination state" },
  { name: "distanceKm", label: "Distance (km)", type: "number" as const },
  { name: "estimatedHours", label: "Estimated hours", type: "number" as const },
  { name: "tollEstimate", label: "Toll estimate (₹)", type: "number" as const },
];

export const routes: ResourceConfig = {
  key: "routes",
  title: "Routes",
  singular: "Route",
  description: "Origin and destination pairs used for rates and bookings.",
  group: "Pricing",
  icon: RouteIcon,
  roles: OPS,
  path: "/routes",
  paging: "server",
  searchable: true,
  columns: [
    { header: "Name", key: "name" },
    { header: "Route", cell: (r) => `${r.originCity} → ${r.destCity}` },
    { header: "Distance (km)", key: "distanceKm" },
    { header: "Toll", key: "tollEstimate", kind: "money" },
    { header: "Status", key: "isActive", kind: "bool" },
  ],
  fields: routeFields,
  editFields: [
    ...routeFields,
    { name: "isActive", label: "Active", type: "checkbox", placeholder: "Active" },
  ],
  deletable: true,
};

const rateFields = [
  { name: "routeId", label: "Route", type: "lookup" as const, lookup: routeLookup },
  {
    name: "customerId",
    label: "Customer (blank = default rate)",
    type: "lookup" as const,
    lookup: customerLookup,
  },
  { name: "vehicleType", label: "Vehicle type", type: "select" as const, options: VehicleType },
  { name: "rateType", label: "Rate type", type: "select" as const, options: RateType, required: true },
  { name: "rate", label: "Rate (₹)", type: "number" as const, required: true },
  { name: "minCharge", label: "Minimum charge (₹)", type: "number" as const },
  { name: "validFrom", label: "Valid from", type: "date" as const },
  { name: "validTo", label: "Valid to", type: "date" as const },
];

export const rateCards: ResourceConfig = {
  key: "rate-cards",
  title: "Rate cards",
  singular: "Rate card",
  description: "Freight rates per route, customer and vehicle type.",
  group: "Pricing",
  icon: Percent,
  roles: OPS,
  path: "/rate-cards",
  paging: "client",
  detail: false,
  filters: [{ name: "activeOnly", label: "Active only", options: ["true", "false"] }],
  columns: [
    { header: "Route", cell: (r) => r.route ? r.route.name || `${r.route.originCity} → ${r.route.destCity}` : "Any route" },
    { header: "Customer", cell: (r) => r.customer?.name ?? "Default" },
    { header: "Vehicle", key: "vehicleType", kind: "pill" },
    { header: "Rate type", key: "rateType", kind: "pill" },
    { header: "Rate", key: "rate", kind: "money" },
    { header: "Min charge", key: "minCharge", kind: "money" },
    { header: "Valid from", key: "validFrom", kind: "date" },
    { header: "Status", key: "isActive", kind: "bool" },
  ],
  fields: rateFields,
  editFields: [
    ...rateFields,
    { name: "isActive", label: "Active", type: "checkbox", placeholder: "Active" },
  ],
  deletable: true,
};

const quotationFields = [
  { name: "customerId", label: "Customer", type: "lookup" as const, lookup: customerLookup, required: true },
  { name: "routeId", label: "Route", type: "lookup" as const, lookup: routeLookup },
  { name: "pickupCity", label: "Pickup city", required: true },
  { name: "dropCity", label: "Drop city", required: true },
  { name: "goodsDescription", label: "Goods", type: "textarea" as const },
  { name: "weightTons", label: "Weight (tons)", type: "number" as const },
  { name: "packageCount", label: "Packages", type: "number" as const },
  { name: "vehicleType", label: "Vehicle type", type: "select" as const, options: VehicleType },
  { name: "rateType", label: "Rate type", type: "select" as const, options: RateType },
  {
    name: "manualRate",
    label: "Manual rate (₹)",
    type: "number" as const,
    hint: "Only for a negotiated rate; otherwise the rate card is used",
  },
  { name: "distanceKm", label: "Distance (km)", type: "number" as const },
  { name: "otherCharges", label: "Other charges (₹)", type: "number" as const },
  { name: "gstPercent", label: "GST %", type: "number" as const },
  { name: "validUntil", label: "Valid until", type: "date" as const },
  { name: "notes", label: "Notes", type: "textarea" as const },
];

export const quotations: ResourceConfig = {
  key: "quotations",
  title: "Quotations",
  singular: "Quotation",
  description: "Quotes for customers: send, accept or reject.",
  group: "Pricing",
  icon: FileText,
  roles: OPS,
  path: "/quotations",
  paging: "server",
  filters: [{ name: "status", label: "Status", options: QuotationStatus }],
  columns: [
    { header: "No.", key: "quotationNo" },
    { header: "Customer", key: "customer.name" },
    { header: "Route", cell: (r) => `${r.pickupCity} → ${r.dropCity}` },
    { header: "Status", key: "status", kind: "pill" },
    { header: "Total", key: "totalAmount", kind: "money" },
    { header: "Valid until", key: "validUntil", kind: "date" },
  ],
  fields: quotationFields,
  actions: [
    {
      label: "Send",
      method: "patch",
      url: (r) => `/quotations/${r.id}/send`,
      when: (r) => r.status === "DRAFT",
      done: "Quotation sent",
    },
    {
      label: "Accept",
      method: "patch",
      url: (r) => `/quotations/${r.id}/accept`,
      when: (r) => r.status === "SENT",
      done: "Quotation accepted",
    },
    {
      label: "Reject",
      method: "patch",
      url: (r) => `/quotations/${r.id}/reject`,
      when: (r) => r.status === "SENT",
      danger: true,
      confirm: "Reject this quotation?",
      done: "Quotation rejected",
    },
  ],
};

export const PRICING = [routes, rateCards, quotations];
