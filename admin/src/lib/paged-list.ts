/**
 * Normalises an admin list response before a page renders it. The backend
 * answers `{ data, total, page, pages }`, older routes a bare array; a broken
 * proxy, an error body or a partial payload must render as an empty/defaulted
 * list instead of crashing the page (QA crash-sweep, disputes/orders/gdpr).
 */
export interface PagedList<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function nonNegativeInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/**
 * Rows are kept only when they are objects (a null or scalar row would crash
 * `row.id`); the row shape itself is the server contract for `T`.
 */
export function normalizePagedList<T>(res: unknown, requestedPage: number): PagedList<T> {
  const rawRows: unknown[] = Array.isArray(res) ? res : isRecord(res) && Array.isArray(res.data) ? res.data : [];
  const data = rawRows.filter(isRecord) as unknown as T[];
  const body = isRecord(res) ? res : {};
  const total = nonNegativeInt(body.total) ?? data.length;
  const page = nonNegativeInt(body.page) || Math.max(1, Math.floor(requestedPage) || 1);
  const pages = nonNegativeInt(body.pages) || 1;
  return { data, total, page, pages };
}

/** `{ status: count }` map; non-numeric counts are dropped. */
export function normalizeStatusCounts(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(v)) return out;
  for (const [key, count] of Object.entries(v)) {
    const n = nonNegativeInt(count);
    if (n !== null) out[key] = n;
  }
  return out;
}
