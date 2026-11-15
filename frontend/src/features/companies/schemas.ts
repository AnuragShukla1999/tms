import { z } from "zod";

// Mirrors CreateCompanyDto. The backend only checks types, so no extra format rules here.
const optionalText = z.string().trim().optional();

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Enter the company name"),
  legalName: optionalText,
  gstin: optionalText,
  phone: optionalText,
  email: z.string().trim().email("Enter a valid email address").or(z.literal("")).optional(),
  address: optionalText,
  city: optionalText,
  state: optionalText,
  pincode: optionalText,
  adminName: z.string().trim().min(1, "Enter the admin's name"),
  adminEmail: z.string().trim().email("Enter a valid email address"),
  adminPhone: z.string().trim().min(1, "Enter the admin's phone number"),
  adminPassword: z.string().min(8, "Use at least 8 characters"),
});

export type CreateCompanyForm = z.infer<typeof createCompanySchema>;

/** The API rejects empty strings for optional email/etc. and unknown keys, so drop blanks. */
export function toCreateCompanyPayload(values: CreateCompanyForm): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter(([, v]) => typeof v === "string" && v.trim() !== ""),
  ) as Record<string, string>;
}
