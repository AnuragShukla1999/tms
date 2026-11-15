/** The backend returns lists in several shapes; this normalises all of them. */
export interface Paged {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  raw: any;
}

export function normalizeList(raw: any, page = 1, limit = 10): Paged {
  if (Array.isArray(raw)) {
    return { rows: raw, total: raw.length, page, limit, totalPages: Math.max(1, Math.ceil(raw.length / limit)), raw };
  }
  const rows: any[] = Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.parties)
        ? raw.parties
        : [];
  const meta = raw?.meta ?? raw?.pagination ?? {};
  const total = Number(meta.total ?? raw?.total ?? rows.length);
  const lim = Number(meta.limit ?? limit);
  return {
    rows,
    total,
    page: Number(meta.page ?? page),
    limit: lim,
    totalPages: Number(meta.totalPages ?? Math.max(1, Math.ceil(total / lim))),
    raw,
  };
}

/** Single-record responses are either the record or `{ message, data: record }`. */
export function unwrap(raw: any): any {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
    return raw.data;
  }
  return raw;
}
