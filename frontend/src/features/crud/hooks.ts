import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

/** Drops empty values so "", null and undefined are never sent as query-string params. */
function clean(params?: Record<string, unknown>) {
  if (!params) return undefined;
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null));
}

/**
 * The query definition for `GET <url>?<params>`.
 * It is shared by useApiList and by prefetching (hovering a sidebar link), so both
 * use exactly the same cache key and the page finds the data already loaded.
 */
export function listQuery(url: string, params?: Record<string, unknown>) {
  return queryOptions({
    queryKey: ["res", url, params ?? {}],
    // Passing `signal` lets React Query cancel the request when you leave the page. That frees
    // the browser's limited parallel connections for the page you are going to.
    queryFn: ({ signal }) => api.get(url, { params: clean(params), signal }).then((r) => r.data),
  });
}

/** Reads a list (or a single record) from the API and caches it. */
export function useApiList(url: string, params?: Record<string, unknown>, enabled = true) {
  return useQuery({ ...listQuery(url, params), enabled });
}

/** POST / PATCH / DELETE. After success every cached list is refetched. */
export function useApiMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { method: "post" | "patch" | "delete"; url: string; data?: unknown }) =>
      (await api.request({ method: v.method, url: v.url, data: v.data })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["res"] }),
  });
}
