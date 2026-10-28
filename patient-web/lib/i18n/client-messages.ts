/**
 * F82-1: the messages the browser needs.
 *
 * The locale layout used to hand the whole catalogue (82 namespaces, about 77 KB of Arabic
 * JSON) to <NextIntlClientProvider>, which put every string of every screen into the HTML of
 * every page. Only components that call the useTranslations hook read messages in the browser;
 * server components read them on the server. These are the namespaces that client components read on (nearly) every
 * page: the root layout, the error and loading screens and the shared core shell. The rest is per section
 * (ROUTE_GROUP_NAMESPACES below).
 *
 * `lib/i18n/client-messages.test.ts` scans the source and fails when a client component asks
 * for a namespace that is not listed here, so a new namespace in a client component cannot ship with a
 * missing string (a missing namespace would render the key instead of the text).
 */
export const CLIENT_NAMESPACES = [
  "CoreShell",
  "HomeWeb",
  // the offline banner in the locale layout (P15.4)
  "Network",
  "NotificationSettings",
  "RouteState",
  // the "being checked for safety" state of an uploaded file, shown wherever a file is uploaded or opened
  "ScanStatus",
  "Search",
  // the instant suggestions of the home hero search box and the search page (issue 1544)
  "SearchSuggest",
  "Shared",
] as const;

export type ClientNamespace = (typeof CLIENT_NAMESPACES)[number];

/** Keep only the namespaces the client reads. Does not mutate its input. */
export function pickClientMessages<T extends Record<string, unknown>>(messages: T): Partial<T> {
  const picked: Partial<T> = {};
  for (const namespace of CLIENT_NAMESPACES) {
    if (namespace in messages) picked[namespace as keyof T] = messages[namespace as keyof T];
  }
  return picked;
}

/**
 * F82-3 / F82 (issue 427): the namespaces that only the client components of ONE section read. The key is the section's
 * folder under app/[locale]; its layout.tsx wraps the section in <RouteMessages group="<folder>"> (components-next/route-messages.tsx),
 * which hands the client the base namespaces plus these. Every other page does not carry them: the whole list used to go
 * into the HTML of every page (about 96 KB of the 119 KB of the page data of /ar/consultations/doctors), which the browser
 * downloaded and parsed before the first paint and again while hydrating.
 * lib/i18n/client-messages.test.ts follows the imports of every page, layout, loading and error file under app/[locale] and
 * fails when one of them reaches a component that reads a namespace that is neither a base one nor in its section's list, or
 * when a listed section has no layout that provides its list.
 */
export const ROUTE_GROUP_NAMESPACES: Record<string, readonly string[]> = {
  "home-care": ["NursingWeb"],
  ai: ["AiHealthReport", "AssistantWeb", "Emergency", "RxUpload"],
  appointments: ["ConsultClient", "TelehealthConsent"],
  articles: ["Articles", "PharmacyBrowse"],
  c: ["PharmacyBrowse", "PublicProduct"],
  cart: ["CartScreen", "LegalLinks", "PharmacyAddress", "PharmacyCheckout", "PharmacyFlow"],
  chat: ["ChatDetail"],
  consultations: ["BookConsultation", "InstantConsult", "Doctors", "LegalLinks", "ShareReport", "SpecialtyNames", "TelehealthConsent"],
  diagnostics: ["DiagWeb", "OrderingFlow"],
  emergency: ["Emergency"],
  family: ["CameraScan", "FamilyWeb", "HealthWeb"],
  "forgot-password": ["ForgotPassword"],
  health: ["HealthWeb"],
  insurance: ["InsuranceWeb"],
  labs: ["OrderingFlow"],
  login: ["Login"],
  loyalty: ["LoyaltyHubWeb"],
  map: ["AccountWeb"],
  maternity: ["LogForms", "MaternityWeb"],
  "mental-health": ["LogForms"],
  notifications: ["Notifications"],
  nursing: ["NursingWeb", "OrderingFlow", "OrderTracking"],
  nutrition: ["LogForms", "NutritionWeb"],
  offers: ["OffersWeb"],
  medicines: ["PharmacyBrowse"],
  orders: ["OrderTracking", "Orders", "PharmacyOffers", "HealthWeb"],
  otp: ["Otp"],
  p: ["PharmacyBrowse", "PublicProduct"],
  "password-reset": ["PasswordReset"],
  payments: ["Payments"],
  pharmacy: ["CartScreen", "OrderReorder", "PharmacyAddress", "PharmacyBarcode", "PharmacyBrowse", "PharmacyChat", "PharmacyCheckout", "PharmacyFlow", "PharmacyOffers", "PharmacyRequest", "Prescriptions", "RxUpload"],
  profile: ["AccountWeb", "AddressMap", "Addresses", "DeliveryAddressSelect"],
  prescriptions: ["Prescriptions"],
  programs: ["ProgramsWeb"],
  q: ["Doctors", "PharmacyBrowse", "PublicProduct"],
  register: ["Register", "Login"],
  reports: ["HealthWeb"],
  returns: ["ReturnsWeb"],
  search: ["SpecialtyNames", "PublicProduct"],
  settings: ["AgentConsent", "SettingsWeb"],
  support: ["SupportChatWeb"],
  // the wishlist rows: remove (the heart) and add to cart (wishlist-row-actions)
  wishlist: ["PharmacyBrowse"],
  welcome: ["Welcome"],
};

/** The base client namespaces plus those of one route group. Does not mutate its input. */
export function pickRouteMessages<T extends Record<string, unknown>>(messages: T, group: string): Partial<T> {
  const picked = pickClientMessages(messages);
  for (const namespace of ROUTE_GROUP_NAMESPACES[group] ?? []) {
    if (namespace in messages) picked[namespace as keyof T] = messages[namespace as keyof T];
  }
  return picked;
}
