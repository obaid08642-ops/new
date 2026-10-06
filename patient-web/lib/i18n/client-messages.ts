/**
 * F82-1: the messages the browser needs.
 *
 * The locale layout used to hand the whole catalogue (82 namespaces, about 77 KB of Arabic
 * JSON) to <NextIntlClientProvider>, which put every string of every screen into the HTML of
 * every page. Only components that call the useTranslations hook read messages in the browser;
 * server components read them on the server. These are the namespaces those components use.
 *
 * `lib/i18n/client-messages.test.ts` scans the source and fails when a client component asks
 * for a namespace that is not listed here, so a new namespace in a client component cannot ship with a
 * missing string (a missing namespace would render the key instead of the text).
 */
export const CLIENT_NAMESPACES = [
  "Addresses",
  "AiHealthReport",
  "BookConsultation",
  "CartScreen",
  "ConsultClient",
  "CoreShell",
  "DeliveryAddressSelect",
  "Doctors",
  "ForgotPassword",
  "HomeWeb",
  "Login",
  "NotificationSettings",
  "Notifications",
  "Onboarding",
  "OrderReorder",
  "OrderTracking",
  "Orders",
  "Otp",
  "PasswordReset",
  "Payments",
  "PharmacyAddress",
  "PharmacyBarcode",
  "PharmacyBrowse",
  "PharmacyChat",
  "PharmacyCheckout",
  "PharmacyFlow",
  "PharmacyOffers",
  "PharmacyRequest",
  "Prescriptions",
  "ProductGallery",
  "PublicProduct",
  "Register",
  "RouteState",
  "RxUpload",
  "Search",
  "ShareReport",
  "Shared",
  "SpecialtyNames",
  "Welcome",
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
 * F82-3: namespaces that only the client components of ONE route group read (the pharmacy screens of Batch 1 bring about
 * 36 KB of them). They stay out of CLIENT_NAMESPACES, so the first load of every other page does not carry them; the
 * group's own layout wraps its pages in <RouteMessages group="..."/> (components-next/route-messages.tsx), which hands the
 * client the base namespaces plus the group's. `paths` are the source folders whose client components may read them
 * (lib/i18n/client-messages.test.ts fails when a component outside them does, or when a namespace is listed twice).
 * Empty until a group needs one.
 */
export const ROUTE_GROUP_NAMESPACES: Record<string, { paths: readonly string[]; namespaces: readonly string[] }> = {};

/** The base client namespaces plus those of one route group. Does not mutate its input. */
export function pickRouteMessages<T extends Record<string, unknown>>(messages: T, group: string): Partial<T> {
  const picked = pickClientMessages(messages);
  for (const namespace of ROUTE_GROUP_NAMESPACES[group]?.namespaces ?? []) {
    if (namespace in messages) picked[namespace as keyof T] = messages[namespace as keyof T];
  }
  return picked;
}
