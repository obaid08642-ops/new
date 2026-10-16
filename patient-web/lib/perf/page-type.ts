/**
 * P14.23 real-user monitoring: the page type a web-vitals sample is filed under. The same names as the backend's
 * RUM_PAGE_TYPES (backend/src/modules/rum/rum.constants.ts; tests/page-type.test.ts keeps them equal). No URL, slug or
 * id leaves the browser: only this type.
 */
export const PAGE_TYPES = [
  "home", "product", "catalogue", "doctor", "doctors", "article", "articles", "lab", "radiology", "pharmacy",
  "facility", "condition", "service", "cart", "checkout", "orders", "account", "auth", "other",
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

const RULES: Array<[RegExp, PageType]> = [
  [/^\/?$/, "home"],
  [/^\/p\/[^/]+/, "product"],
  [/^\/(c|medicine-catalog)(\/|$)/, "catalogue"],
  [/^\/(doctor|doctors)\/[^/]+/, "doctor"],
  [/^\/consultations\/doctors\/[^/]+/, "doctor"],
  [/^\/consultations(\/doctors|\/specialties)?\/?$/, "doctors"],
  [/^\/articles\/[^/]+/, "article"],
  [/^\/articles\/?$/, "articles"],
  [/^\/(labs|diagnostics\/labs|diagnostics\/packages)(\/|$)/, "lab"],
  [/^\/(radiology|diagnostics\/radiology)(\/|$)/, "radiology"],
  [/^\/(cart|pharmacy\/cart)(\/|$)/, "cart"],
  [/^\/(checkout|pharmacy\/(payment|order-confirm|final-quote))(\/|$)/, "checkout"],
  [/^\/(pharmacy|pharmacies)(\/|$)/, "pharmacy"],
  [/^\/facility\/[^/]+/, "facility"],
  [/^\/condition\/[^/]+/, "condition"],
  [/^\/(services|home-care|home-nursing|nursing|features)(\/|$)/, "service"],
  [/^\/orders(\/|$)/, "orders"],
  [/^\/(profile|settings|dashboard|notifications|prescriptions|family|wishlist|loyalty|insurance|appointments)(\/|$)/, "account"],
  [/^\/(login|register|otp|oauth|password-reset|forgot-password|onboarding|welcome)(\/|$)/, "auth"],
];

/** `/ar/p/panadol` -> "product". The locale prefix is ignored. */
export function pageType(pathname: string): PageType {
  const path = pathname.replace(/^\/(ar|en|ur|hi|bn|fil)(?=\/|$)/, "") || "/";
  for (const [re, type] of RULES) if (re.test(path)) return type;
  return "other";
}
