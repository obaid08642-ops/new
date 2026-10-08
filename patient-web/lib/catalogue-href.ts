/**
 * Where an old medicines-list / filters / medicine-catalog URL lands on the canonical catalogue (`/c`, second pass section 3):
 * the category is a path segment, the search words and the page stay as `q` and `page`. The old `sort` is not carried over:
 * the public catalogue has no ordering parameter.
 */
export function catalogueHref(locale: string, query: { category?: string | string[]; filter_category?: string | string[]; q?: string | string[]; page?: string | string[] }): string {
  const one = (value: string | string[] | undefined) => ((Array.isArray(value) ? value[0] : value) ?? "").trim();
  const category = one(query.category) || one(query.filter_category);
  const path = category && category !== "all" ? `/${locale}/c/${encodeURIComponent(category)}` : `/${locale}/c`;
  const params = new URLSearchParams();
  const q = one(query.q).slice(0, 80);
  const pageNumber = Number(one(query.page));
  if (q) params.set("q", q);
  if (Number.isInteger(pageNumber) && pageNumber > 1 && pageNumber <= 10000) params.set("page", String(pageNumber));
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}
