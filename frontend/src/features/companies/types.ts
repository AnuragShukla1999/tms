import type { Role } from "@/lib/roles";

// Shapes taken from prisma/schema.prisma and company.service.ts (what each query selects).
export interface Company {
  id: string;
  name: string;
  legalName: string | null;
  gstin: string | null;
  pan: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  logoUrl: string | null;
  invoicePrefix: string;
  bookingPrefix: string;
  lrPrefix: string;
  tripPrefix: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /companies */
export interface CompanyListItem extends Company {
  _count: { users: number; customers: number; vehicles: number; drivers: number };
}

export interface CompanyBranch {
  id: string;
  name: string;
  code: string;
  city: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface CompanyUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: Role;
  isActive: boolean;
}

/** GET /companies/:id */
export interface CompanyDetail extends Company {
  branches: CompanyBranch[];
  users: CompanyUser[];
}

/** POST /companies */
export interface CreateCompanyResponse {
  message: string;
  data: Company & {
    users: { id: string; name: string; email: string | null; phone: string; role: Role; companyId: string | null }[];
  };
}
