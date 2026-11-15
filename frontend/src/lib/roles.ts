// Mirrors the backend `UserRole` enum (prisma/schema.prisma).
export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "DISPATCHER",
  "ACCOUNTANT",
  "DRIVER",
  "CUSTOMER",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Company admin",
  MANAGER: "Manager",
  DISPATCHER: "Dispatcher",
  ACCOUNTANT: "Accountant",
  DRIVER: "Driver",
  CUSTOMER: "Customer",
};
