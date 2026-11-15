import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { companyService } from "./company.service";

export const companyKeys = {
  all: ["companies"] as const,
  list: () => [...companyKeys.all, "list"] as const,
  detail: (id: string) => [...companyKeys.all, "detail", id] as const,
};

export function useCompanies() {
  return useQuery({ queryKey: companyKeys.list(), queryFn: companyService.list });
}

export function useCompany(id: string) {
  return useQuery({ queryKey: companyKeys.detail(id), queryFn: () => companyService.get(id) });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: companyService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.all }),
  });
}
