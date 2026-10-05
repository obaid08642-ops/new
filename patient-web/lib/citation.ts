/**
 * "Cite this" text (plain + BibTeX) from real page data only.
 *
 * Deterministic: every date is passed in (the access date is computed once on
 * the server and handed to the client component) and formatted in UTC, so the
 * server render and the client hydration produce the same text.
 */
export type CitationInput = {
  title: string;
  uri: string;
  author?: string | null;
  publishedAt?: string | null;
  locale: string;
  /** Access date, YYYY-MM-DD, computed by the server page. */
  accessedAt: string;
};

const fmt = (d: Date, isAr: boolean) => d.toLocaleDateString(isAr ? "ar-SA" : "en-US", { timeZone: "UTC" });

export function buildCitation(input: CitationInput): { plain: string; bibtex: string } {
  const { title, uri, author, publishedAt, locale, accessedAt } = input;
  const isAr = locale === "ar";
  const published = publishedAt ? new Date(publishedAt) : null;
  const publishedOk = published && !Number.isNaN(published.getTime()) ? published : null;
  const accessed = new Date(`${accessedAt}T00:00:00Z`);
  const year = (publishedOk ?? accessed).getUTCFullYear();
  const key = `nabd-${year}-${title.slice(0, 12).replace(/\s+/g, "")}`;
  // Decode for human display — don't show %8B%9A
  let displayUri = uri;
  try { displayUri = decodeURIComponent(uri); } catch { /* keep the encoded form */ }
  const bibtex = `@misc{${key},\n  title = {${title}},\n  author = {${author || "Nabd Plus"}},\n  year = {${year}},\n  url = {${uri}},\n  urldate = {${accessedAt}},\n  note = {${isAr ? "منصة نبض بلس الصحية" : "Nabd Plus healthcare platform"}}\n}`;
  const plain = `${author ? `${author}. ` : ""}"${title}." Nabd Plus${publishedOk ? `, ${fmt(publishedOk, isAr)}` : ""}. ${displayUri}. ${isAr ? `تاريخ الوصول ${fmt(accessed, isAr)}.` : `Accessed ${fmt(accessed, isAr)}.`}`;
  return { plain, bibtex };
}

/** The access date for a citation rendered now (server side). */
export function citationAccessDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
