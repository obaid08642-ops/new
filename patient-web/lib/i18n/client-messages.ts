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
  "AccountWeb",
  "AiHealthReport",
  "Articles",
  "AssistantWeb",
  "BookConsultation",
  "CartScreen",
  "ConsultClient",
  "CoreShell",
  "DeliveryAddressSelect",
  "DiagWeb",
  "Doctors",
  "FamilyWeb",
  "ForgotPassword",
  "HealthWeb",
  "HomeWeb",
  "InsuranceWeb",
  "Login",
  "LoyaltyHubWeb",
  "MaternityWeb",
  "NotificationSettings",
  "Notifications",
  "NursingWeb",
  "NutritionWeb",
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
  "ProgramsWeb",
  "PublicProduct",
  "Register",
  "ReturnsWeb",
  "RouteState",
  "RxUpload",
  "Search",
  "SettingsWeb",
  "ShareReport",
  "Shared",
  "SpecialtyNames",
  "SupportChatWeb",
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
