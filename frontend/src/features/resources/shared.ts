import type { Role } from "@/lib/roles";
import type { Lookup } from "../crud/types";

export const OPS: readonly Role[] = ["ADMIN", "MANAGER", "DISPATCHER", "ACCOUNTANT"];
export const MGMT: readonly Role[] = ["ADMIN", "MANAGER"];
export const FIN: readonly Role[] = ["ADMIN", "MANAGER", "ACCOUNTANT"];

// Enums mirror prisma/schema.prisma.
export const VehicleType = [
  "MINI_TRUCK", "PICKUP", "LCV", "ICV", "HCV", "TRAILER", "CONTAINER", "TANKER", "TIPPER", "BUS",
  "CAR", "OTHER",
] as const;
export const VehicleOwnership = ["OWN", "ATTACHED"] as const;
export const VehicleStatus = ["AVAILABLE", "ON_TRIP", "MAINTENANCE", "INACTIVE"] as const;
export const DocumentType = [
  "RC", "INSURANCE", "PERMIT", "FITNESS", "PUC", "ROAD_TAX", "NATIONAL_PERMIT", "OTHER",
] as const;
export const DriverStatus = ["ACTIVE", "ON_TRIP", "ON_LEAVE", "INACTIVE"] as const;
export const BookingStatus = [
  "PENDING", "CONFIRMED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "CLOSED", "CANCELLED",
] as const;
export const PaymentTerms = ["PAID", "TO_PAY", "TO_BE_BILLED"] as const;
export const TripStatus = ["PLANNED", "STARTED", "IN_TRANSIT", "COMPLETED", "CANCELLED"] as const;
export const RateType = ["PER_KM", "PER_TON", "PER_TRIP", "PER_KG", "PER_PACKAGE"] as const;
export const QuotationStatus = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
export const ExpenseCategory = [
  "DIESEL", "TOLL", "LOADING", "UNLOADING", "POLICE_RTO", "REPAIR", "FOOD_ALLOWANCE", "PARKING",
  "DETENTION", "OTHER",
] as const;
export const OfficeExpenseCategory = [
  "SALARY", "RENT", "ELECTRICITY", "OFFICE_SUPPLIES", "INSURANCE", "TAX", "MAINTENANCE",
  "MARKETING", "OTHER",
] as const;
export const InvoiceStatus = [
  "DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED",
] as const;
export const PaymentMode = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD", "ONLINE"] as const;
export const PaymentType = ["ADVANCE", "PART_PAYMENT", "FULL_PAYMENT", "BALANCE"] as const;
export const DriverTransactionType = [
  "ADVANCE", "SALARY", "TRIP_ALLOWANCE", "BONUS", "DEDUCTION", "SETTLEMENT",
] as const;
export const MaintenanceType = [
  "ROUTINE_SERVICE", "REPAIR", "TYRE_CHANGE", "BATTERY", "ACCIDENT", "OTHER",
] as const;
export const EwayBillStatus = ["ACTIVE", "CANCELLED", "EXPIRED", "EXTENDED"] as const;
export const PodStatus = ["PENDING", "RECEIVED", "VERIFIED"] as const;
// The backend only lets a company admin create these (another ADMIN needs a super admin; drivers are records, not logins).
export const EmployeeRole = ["MANAGER", "DISPATCHER", "ACCOUNTANT"] as const;

// Lookups: dropdowns filled from the list endpoints.
export const customerLookup: Lookup = { path: "/customers", label: (r) => r.name };
export const vendorLookup: Lookup = { path: "/vendors", label: (r) => r.name };
export const branchLookup: Lookup = { path: "/branches", label: (r) => `${r.name} (${r.code})` };
export const userLookup: Lookup = { path: "/users", label: (r) => `${r.name} · ${r.role}` };
export const vehicleLookup: Lookup = { path: "/vehicles", noParams: true, label: (r) => r.registrationNo };
export const driverLookup: Lookup = { path: "/drivers", label: (r) => `${r.name} · ${r.licenseNo}` };
export const routeLookup: Lookup = {
  path: "/routes",
  label: (r) => r.name || `${r.originCity} → ${r.destCity}`,
};
export const quotationLookup: Lookup = {
  path: "/quotations",
  label: (r) => `${r.quotationNo} · ${r.pickupCity} → ${r.dropCity}`,
};
export const bookingLookup: Lookup = {
  path: "/bookings",
  label: (r) => `${r.bookingNo} · ${r.customer?.name ?? ""} · ${r.pickupCity} → ${r.dropCity}`,
};
export const tripLookup: Lookup = {
  path: "/trips",
  label: (r) => `${r.tripNo} · ${r.originCity} → ${r.destCity}`,
};
export const lrLookup: Lookup = {
  path: "/lorry-receipts",
  noParams: true,
  label: (r) => `${r.lrNo} · ${r.consigneeName}`,
};
export const invoiceLookup: Lookup = {
  path: "/invoices",
  label: (r) => `${r.invoiceNo} · due ${r.balanceAmount}`,
};
export const dispatchableBookingLookup: Lookup = {
  path: "/bookings",
  filter: (r) => r.status === "CONFIRMED" || r.status === "DISPATCHED",
  label: (r) => `${r.bookingNo} · ${r.customer?.name ?? ""} · ${r.pickupCity} → ${r.dropCity}`,
};
