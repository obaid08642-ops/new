// The search page's result rows, validated by hand. This module is imported by a client component, and zod is
// about 60 KB gz of shared JS that also probes `Function("")` at start-up (a Content-Security-Policy violation
// in the console on every load with our nonce CSP): the shape is nine fields, so plain guards do the same job
// (issue #286).

export interface SearchResult {
  id: string;
  type: string;
  typeEn: string | undefined;
  name: string;
  nameEn: string | undefined;
  sub: string | undefined;
  subEn: string | undefined;
  rate: string | undefined;
  price: string | undefined;
}

/** A required field: a non-empty string, or the row is not a result. */
const required = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

/**
 * The API sends `null` for a field it has no value for (a doctor without a price, a medicine without a rating);
 * that is "absent", not a malformed result, so it must not drop the whole row. Anything else that is not a
 * string does.
 */
const optional = (value: unknown): string | undefined | null =>
  value === null || value === undefined ? undefined : typeof value === "string" ? value : null;

function parseRow(value: unknown): SearchResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = required(row.id);
  const type = required(row.type);
  const name = required(row.name);
  if (id === null || type === null || name === null) return null;
  const typeEn = optional(row.typeEn);
  const nameEn = optional(row.nameEn);
  const sub = optional(row.sub);
  const subEn = optional(row.subEn);
  const rate = optional(row.rate);
  const price = optional(row.price);
  if ([typeEn, nameEn, sub, subEn, rate, price].some((field) => field === null)) return null;
  return {
    id,
    type,
    typeEn: typeEn as string | undefined,
    name,
    nameEn: nameEn as string | undefined,
    sub: sub as string | undefined,
    subEn: subEn as string | undefined,
    rate: rate as string | undefined,
    price: price as string | undefined,
  };
}

export function extractSearchResults(payload: unknown, locale: string): SearchResult[] {
  const values = Array.isArray(payload) ? payload : [];
  const isAr = locale === "ar";
  return values.flatMap((value) => {
    const r = parseRow(value);
    if (!r) return [];
    return [{
      ...r,
      name: (isAr ? r.name : r.nameEn || r.name) || r.name,
      sub: isAr ? r.sub : r.subEn || r.sub,
      type: isAr ? r.type : r.typeEn || r.type,
    }];
  });
}

/** The longest query the page sends, in characters (not encoded bytes: an Arabic letter is 6 characters once percent-encoded). */
export const MAX_QUERY_CHARS = 120;

/** The query cut to MAX_QUERY_CHARS whole characters (never in the middle of a surrogate pair). */
export function truncateQuery(value: string): string {
  const chars = Array.from(value);
  return chars.length > MAX_QUERY_CHARS ? chars.slice(0, MAX_QUERY_CHARS).join("") : value;
}

/** The backend's intent parser answers an actionable intent with a confidence of 0.85 or more (a guess is 0.5). */
export const INTENT_CONFIDENCE = 0.85;

/**
 * Where a typed query that found NOTHING should go instead (POST /search/intent): an internal page of the page's locale, only
 * when the parser is confident and the page is not the search page itself. Anything else returns null and the empty state shows.
 */
export function intentRedirect(intent: unknown, locale: string): string | null {
  if (!intent || typeof intent !== "object" || Array.isArray(intent)) return null;
  const { canonical_path: path, confidence } = intent as { canonical_path?: unknown; confidence?: unknown };
  if (typeof path !== "string" || typeof confidence !== "number" || confidence < INTENT_CONFIDENCE) return null;
  if (!/^\/[A-Za-z0-9\-._~%/]*$/.test(path) || path.startsWith("//") || path.split("/").includes("..")) return null;
  const target = path === `/${locale}` || path.startsWith(`/${locale}/`) ? path : `/${locale}${path}`;
  return target === `/${locale}/search` ? null : target;
}
