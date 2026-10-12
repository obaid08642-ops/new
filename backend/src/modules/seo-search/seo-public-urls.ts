import type { Connection } from 'mongoose';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { PUBLIC_CATALOG_LOCALES, productLocaleToDb } from '../medicines/med-i18n';

/**
 * The public web pages of an entity, in the six site locales (owner 2026-10-12, SEO/IndexNow).
 * One place for IndexNow pings and the backend sitemap, so both name the URLs the patient web
 * really serves (patient-web/app/[locale]/...):
 *
 *   medicine           /{l}/p/{translations[db].slug || slug}       (slug differs per locale)
 *   doctor             /{l}/doctor/{slug || id}
 *   facility           /{l}/facility/{slug || id}
 *   pharmacy           /{l}/pharmacy/{slug || id}                     (a provider profile of type pharmacy)
 *   article            /{l}/articles/{slug}
 *   condition          /{l}/condition/{code || slug}
 *   lab_service        /{l}/labs/{slug || short_code || id}/{city}   (the city pages labs.xml lists)
 *   radiology_service  /{l}/diagnostics/radiology/{id}   (the /radiology/{token}/{city} variants do not
 *                      depend on the city: they point at this page and are not indexed)
 *   home_care_service  /{l}/home-care/services/{id}
 */
export const SITE_LOCALES = PUBLIC_CATALOG_LOCALES;
export type SiteLocale = (typeof SITE_LOCALES)[number];

export type PublicEntityType =
  | 'medicine' | 'doctor' | 'facility' | 'pharmacy' | 'article' | 'condition'
  | 'lab_service' | 'radiology_service' | 'home_care_service';

export function siteOrigin(): string {
  return (process.env.NABD_PUBLIC_URL || 'https://nabd.plus').replace(/\/+$/, '');
}

const enc = (s: unknown) => encodeURIComponent(String(s));
const has = (s: unknown) => typeof s === 'string' ? s.trim().length > 0 : typeof s === 'number';

/** The radiology URL token, built exactly like patient-web/app/sitemaps/radiology.xml. */
export function radiologyToken(e: Record<string, any>): string {
  return String(e.slug || e.short_code || e.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Paths (no origin) of one entity in one locale. Empty when the entity has no public identifier. */
export function localizedPaths(type: PublicEntityType, e: Record<string, any>, locale: SiteLocale, cities: string[] = []): string[] {
  const l = locale;
  switch (type) {
    case 'medicine': {
      const slug = e?.translations?.[productLocaleToDb(l)]?.slug || e.slug;
      return has(slug) ? [`/${l}/p/${enc(slug)}`] : [];
    }
    case 'doctor': return has(e.slug || e.id) ? [`/${l}/doctor/${enc(e.slug || e.id)}`] : [];
    case 'facility': return has(e.slug || e.id) ? [`/${l}/facility/${enc(e.slug || e.id)}`] : [];
    case 'pharmacy': return has(e.slug || e.id) ? [`/${l}/pharmacy/${enc(e.slug || e.id)}`] : [];
    case 'article': return has(e.slug) ? [`/${l}/articles/${enc(e.slug)}`] : [];
    case 'condition': return has(e.code || e.slug) ? [`/${l}/condition/${enc(e.code || e.slug)}`] : [];
    case 'lab_service': {
      const test = e.slug || e.short_code || e.id;
      return has(test) ? cities.map((c) => `/${l}/labs/${enc(test)}/${enc(c)}`) : [];
    }
    case 'radiology_service': return has(e.id) ? [`/${l}/diagnostics/radiology/${enc(e.id)}`] : [];
    case 'home_care_service': return has(e.id) ? [`/${l}/home-care/services/${enc(e.id)}`] : [];
  }
}

/** Absolute URLs of one entity in all six locales. */
export function publicUrlsFor(type: PublicEntityType, e: Record<string, any>, cities: string[] = []): string[] {
  const origin = siteOrigin();
  return [...new Set(SITE_LOCALES.flatMap((l) => localizedPaths(type, e, l, cities)).map((p) => `${origin}${p}`))];
}

/** The city slugs the web city pages use (same source and cap as the web sitemaps). */
export async function publicCitySlugs(conn: Connection): Promise<string[]> {
  try {
    const rows = await conn.collection('locations')
      .find({ type: 'city', is_active: true }, { projection: { _id: 0, code: 1 } })
      .limit(150)
      .toArray();
    return [...new Set(rows.map((c: any) => String(c.code || '').replace(/^sa-/, '').toLowerCase()).filter(Boolean))];
  } catch {
    return [];
  }
}

/** Where each type's record lives. */
export const PUBLIC_ENTITY_COLLECTIONS: Record<PublicEntityType, string> = {
  medicine: CATALOG_COLLECTIONS.medicines,
  doctor: 'provider_profiles',
  facility: 'facilities',
  pharmacy: 'provider_profiles',
  article: 'articles',
  condition: 'conditions',
  lab_service: CATALOG_COLLECTIONS.lab_services,
  radiology_service: CATALOG_COLLECTIONS.radiology_services,
  home_care_service: CATALOG_COLLECTIONS.nursing_services,
};

/**
 * Whether the entity may be listed publicly (sitemaps). IndexNow is also told about entities that
 * are NOT public any more, so search engines drop them; this decides only what a sitemap lists.
 */
export function isPublicIndexable(type: PublicEntityType, e: Record<string, any>): boolean {
  if (!e || e.is_deleted === true) return false;
  const governed = e.public_eligibility === true && e.medical_review_status === 'approved';
  switch (type) {
    case 'medicine': return governed && e.indexing_eligibility === true && e.active !== false;
    case 'doctor': return governed && e.type === 'doctor' && e.status === 'active' && e.indexing_eligibility === true;
    case 'facility': return governed && e.is_active === true && e.indexing_eligibility === true;
    case 'pharmacy': return governed && e.type === 'pharmacy' && e.status === 'active' && e.indexing_eligibility === true;
    case 'article': return e.status === 'PUBLISHED';
    case 'condition': return e.is_active === true;
    case 'lab_service':
    case 'radiology_service':
    case 'home_care_service': return governed && e.active === true;
  }
}

/** Mongo filter matching isPublicIndexable (for sitemap queries). */
export function publicIndexableFilter(type: PublicEntityType): Record<string, unknown> {
  const governed = { public_eligibility: true, medical_review_status: 'approved', is_deleted: { $ne: true } };
  switch (type) {
    case 'medicine': return { ...governed, indexing_eligibility: true, active: { $ne: false } };
    case 'doctor': return { ...governed, type: 'doctor', status: 'active', indexing_eligibility: true };
    case 'facility': return { ...governed, is_active: true, indexing_eligibility: true };
    case 'pharmacy': return { ...governed, type: 'pharmacy', status: 'active', indexing_eligibility: true };
    case 'article': return { status: 'PUBLISHED', is_deleted: { $ne: true } };
    case 'condition': return { is_active: true, is_deleted: { $ne: true } };
    case 'lab_service':
    case 'radiology_service':
    case 'home_care_service': return { ...governed, active: true };
  }
}
