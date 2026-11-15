import { api } from "@/lib/axios";
import type { CompanyDetail, CompanyListItem, CreateCompanyResponse } from "./types";

export const companyService = {
  list: () => api.get<CompanyListItem[]>("/companies").then((r) => r.data),

  /** The backend answers 200 with an empty body (not 404) for an unknown id. */
  get: (id: string) =>
    api
      .get<CompanyDetail | "">(`/companies/${id}`)
      .then((r) => (r.data === "" ? null : r.data)),

  create: (payload: Record<string, string>) =>
    api.post<CreateCompanyResponse>("/companies", payload).then((r) => r.data),
};
