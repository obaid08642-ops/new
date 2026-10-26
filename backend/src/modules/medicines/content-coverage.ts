/**
 * Coverage of the product content per language (owner complaint 2026-10-26: sections of one page in mixed languages), and the health of
 * the per-locale slugs. Pure: the read-only tool `src/scripts/content-coverage.ts` feeds it the published products and prints counts only.
 */
import { CONTENT_FIELDS, productLocaleToDb, storedContentText, type ContentField, type ContentLocale } from './med-i18n';

export const CONTENT_LOCALES: readonly ContentLocale[] = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];

export interface FieldCoverage { has: number; only_other: number; missing: number }
export type Coverage = Record<ContentLocale, Record<ContentField, FieldCoverage>>;

export function emptyCoverage(): Coverage {
  const out = {} as Coverage;
  for (const l of CONTENT_LOCALES) {
    out[l] = {} as Record<ContentField, FieldCoverage>;
    for (const f of CONTENT_FIELDS) out[l][f] = { has: 0, only_other: 0, missing: 0 };
  }
  return out;
}

/** One product into the counts: per locale and field, has the text / has it only in another language / has it nowhere. */
export function addProduct(cov: Coverage, raw: Record<string, any>): void {
  for (const f of CONTENT_FIELDS) {
    const present = CONTENT_LOCALES.map((l) => storedContentText(raw, f, l) !== null);
    const any = present.some(Boolean);
    CONTENT_LOCALES.forEach((l, i) => {
      const c = cov[l][f];
      if (present[i]) c.has += 1; else if (any) c.only_other += 1; else c.missing += 1;
    });
  }
}

/** The slug a locale page links with (`slugs[locale]` of the public DTO) and whether GET /public/product/:locale/:slug can find it. */
export function slugOf(raw: Record<string, any>, locale: ContentLocale): { slug: string | null; resolvable: boolean; own: boolean } {
  const db = productLocaleToDb(locale);
  const own = typeof raw?.translations?.[db]?.slug === 'string' && raw.translations[db].slug.trim() ? raw.translations[db].slug.trim() : null;
  const root = typeof raw?.slug === 'string' && raw.slug.trim() ? raw.slug.trim() : null;
  // the DTO falls back to the id; the route looks the slug up in `translations.<db>.slug` and then in `slug` only, so an id-only slug is a 404
  const slug = own ?? root ?? (raw?.id ? String(raw.id) : null);
  return { slug, resolvable: own !== null || root !== null, own: own !== null };
}

export interface SlugHealth { products: number; own_slug: number; root_slug_only: number; unresolvable: number; duplicates: number }

export function slugHealth(rows: Array<Record<string, any>>, locale: ContentLocale): SlugHealth {
  const h: SlugHealth = { products: rows.length, own_slug: 0, root_slug_only: 0, unresolvable: 0, duplicates: 0 };
  const seen = new Map<string, number>();
  for (const raw of rows) {
    const s = slugOf(raw, locale);
    if (!s.resolvable) { h.unresolvable += 1; continue; }
    if (s.own) h.own_slug += 1; else h.root_slug_only += 1;
    seen.set(s.slug as string, (seen.get(s.slug as string) ?? 0) + 1);
  }
  for (const n of seen.values()) if (n > 1) h.duplicates += n;
  return h;
}
