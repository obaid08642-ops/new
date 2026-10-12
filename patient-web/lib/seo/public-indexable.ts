import { routing } from "@/i18n/routing";

/** A locale home (/ar, /en/…). */
function isPublicLocaleHome(pathname: string) {
  return routing.locales.some((locale) => pathname === `/${locale}` || pathname === `/${locale}/`);
}

// Indexable public surfaces: locale homes, articles, the v14 product pages
// /{lang}/p/{slug}, category clusters /{lang}/c…, catalogue landing, plus the
// public SEO detail surfaces that already emit index:true metadata
// (doctor/facility/pharmacy/condition/pharmacies/labs/radiology/services/doctors-specialty,
// diagnostics packages, consultation specialties, home-care service pages, the feature pages /{lang}/features/{slug}). /pharmacy/{slug} excludes
// the signed-in pharmacy screens that share its prefix (cart flow, chat, payment...).
const LOCALE = "(?:ar|en|ur|hi|bn|fil)";
const PUBLIC_INDEXABLE = new RegExp(`^\\/${LOCALE}(?:\\/(?:articles(?:\\/[^/]+)?|p\\/[^/]+|c(?:\\/.*)?|medicine-catalog|consultations\\/doctors(?:\\/[^/]+)?|consultations\\/specialties|diagnostics\\/labs(?:\\/[^/]+)?|diagnostics\\/radiology(?:\\/[^/]+)?|diagnostics\\/packages(?:\\/[^/]+)?|nursing\\/catalog|home-care\\/services\\/[^/]+|map|doctor\\/[^/]+(?:\\/[^/]+)?|facility\\/[^/]+|pharmacy\\/(?!(?:barcode|broadcast-status|chat|custom-item|drug-not-found|filters|final-quote|insurance-decision|interactions|manual-order|order-confirm|payment|reorder|request|rx-order|scan-prescription|waiting-for-pharmacy)(?:\\/|$))[^/]+|condition\\/[^/]+|pharmacies(?:\\/[^/]+)?|labs(?:\\/[^/]+(?:\\/[^/]+)?)?|radiology(?:\\/[^/]+(?:\\/[^/]+)?)?|services(?:\\/[^/]+(?:\\/[^/]+)?)?|doctors\\/[^/]+(?:\\/[^/]+(?:\\/[^/]+)?)?|home-nursing(?:\\/[^/]+)?|features\\/[^/]+))?\\/?$`);

export function isPublicIndexable(pathname: string) {
  return isPublicLocaleHome(pathname) || PUBLIC_INDEXABLE.test(pathname);
}

