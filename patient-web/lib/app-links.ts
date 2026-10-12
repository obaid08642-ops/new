/**
 * The public web pages that open the patient app when it is installed (iOS universal links via
 * /.well-known/apple-app-site-association, Android app links via patient-app/app.json intentFilters).
 * Each path is listed bare and under every locale prefix; the app maps each one to a real screen
 * (patient-app/src/navigation/webLinkMap.ts) and switches to the link's language.
 * Patterns use the AASA syntax: "/x/*" is the prefix "/x/", anything else is an exact path.
 */
export const APP_LINK_LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;

export type AppLinkPath = {
  path: string;
  comment: string;
  /** Only the locale-prefixed form is a link (the locale home: "/ar", "/en", ...). */
  localeOnly?: boolean;
};

export const PUBLIC_APP_LINK_PATHS: readonly AppLinkPath[] = [
  { path: "/", comment: "Locale home", localeOnly: true },
  { path: "/p/*", comment: "Medicine detail" },
  { path: "/c", comment: "Catalogue categories" },
  { path: "/c/*", comment: "Catalogue category" },
  { path: "/doctor/*", comment: "Doctor profile (by slug, by slug and city)" },
  { path: "/doctors/*", comment: "Doctors by specialty and city" },
  { path: "/consultations/doctors", comment: "Doctor list" },
  { path: "/consultations/doctors/*", comment: "Doctor detail" },
  { path: "/facility/*", comment: "Facility profile" },
  { path: "/consultations/clinics/*", comment: "Clinic detail" },
  { path: "/pharmacy/*", comment: "Pharmacy profile" },
  { path: "/pharmacies/*", comment: "Pharmacies by city" },
  { path: "/labs/*", comment: "Lab test by city" },
  { path: "/diagnostics/labs", comment: "Lab list" },
  { path: "/diagnostics/labs/*", comment: "Lab detail" },
  { path: "/diagnostics/packages", comment: "Lab package list" },
  { path: "/diagnostics/packages/*", comment: "Lab package detail" },
  { path: "/radiology/*", comment: "Radiology service by city" },
  { path: "/diagnostics/radiology", comment: "Radiology list" },
  { path: "/diagnostics/radiology/*", comment: "Radiology service detail" },
  { path: "/home-nursing/*", comment: "Home nursing by city" },
  { path: "/nursing/catalog", comment: "Nursing catalogue" },
  { path: "/home-care/services/*", comment: "Home care service detail" },
  { path: "/articles", comment: "Health articles" },
  { path: "/articles/*", comment: "Health article" },
  { path: "/condition/*", comment: "Condition guide" },
];

/** Every link pattern of one entry: the bare path (unless locale-only) and the path under each locale. */
export function appLinkPatterns(entry: AppLinkPath): string[] {
  const localized = APP_LINK_LOCALES.map((locale) => (entry.path === "/" ? `/${locale}` : `/${locale}${entry.path}`));
  return entry.localeOnly ? localized : [entry.path, ...localized];
}

/** All link patterns, in list order. */
export function allAppLinkPatterns(): string[] {
  return PUBLIC_APP_LINK_PATHS.flatMap(appLinkPatterns);
}
