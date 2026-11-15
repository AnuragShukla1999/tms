import type { ResourceConfig } from "./types";

export const PAGE_SIZE = 10;

/**
 * Query-string params for a resource's list endpoint.
 *  - "server" paging: the API paginates and searches, so we send page, limit and search.
 *  - "client" paging: the API returns everything; paging/search happen in the browser.
 *
 * Used by the resource page AND by sidebar prefetching, so both build the same cache key.
 */
export function listParams(
  cfg: ResourceConfig,
  { page = 1, search = "", filters = {} }: { page?: number; search?: string; filters?: Record<string, string> } = {},
) {
  const server = cfg.paging === "server";
  return {
    ...cfg.extraParams,
    ...filters,
    ...(server ? { page, limit: PAGE_SIZE, ...(cfg.searchable && search ? { search } : {}) } : {}),
  };
}
