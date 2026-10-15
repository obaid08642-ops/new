/**
 * P14.25: a hard ceiling on page-size query parameters for every route, so no list endpoint can be asked for an
 * unbounded page (`?limit=1000000`). Routes keep their own, lower caps; this only stops what nothing else stops.
 * The URL is rewritten before routing, so `@Query('limit')`, `req.query` and pipes all see the capped value.
 */
export const LIST_LIMIT_CEILING = 1000;
const PAGE_SIZE_KEYS = new Set(['limit', 'per_page', 'page_size', 'pageSize', 'perPage', 'take', 'size']);

export function capListLimits(url: string, ceiling = LIST_LIMIT_CEILING): string {
  const q = url.indexOf('?');
  if (q < 0) return url;
  const params = new URLSearchParams(url.slice(q + 1));
  let changed = false;
  for (const key of PAGE_SIZE_KEYS) {
    for (const value of params.getAll(key)) {
      const n = Number(value);
      // only an oversized number is touched: anything else keeps the route's own default and validation
      if (value.trim() !== '' && Number.isFinite(n) && n > ceiling) {
        params.set(key, String(ceiling)); // in place; drops repeated values of the same key
        changed = true;
        break;
      }
    }
  }
  return changed ? `${url.slice(0, q)}?${params.toString()}` : url;
}

/**
 * U+2028 / U+2029 (line and paragraph separator) in a query value broke every search that builds a MongoDB regex
 * from it: JavaScript writes them into RegExp.source as `\u2028`, which MongoDB's PCRE2 rejects, so the route
 * answered 500 (found by the schemathesis fuzz on GET /labs/services). They have no use in a query, so they become a
 * space before routing, for all 41 search call sites at once.
 */
export function stripLineSeparators(url: string): string {
  const q = url.indexOf('?');
  if (q < 0) return url;
  const query = url.slice(q + 1);
  const cleaned = query.replace(/%E2%80%A[89]/gi, '%20').replace(/[\u2028\u2029]/g, '%20');
  return cleaned === query ? url : `${url.slice(0, q)}?${cleaned}`;
}

export function listLimitMiddleware(req: { url: string }, _res: unknown, next: () => void) {
  req.url = capListLimits(stripLineSeparators(req.url));
  next();
}
