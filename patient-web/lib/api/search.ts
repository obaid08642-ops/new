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
