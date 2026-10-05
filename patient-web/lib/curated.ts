import { isLocale } from "@/lib/i18n";

/**
 * The first path segment of every page that exists on the web (app/[locale]/<segment>). The admin stores a curated item's
 * `deep_link` as a free string that the mobile app reads as one of ITS routes; on the web only a link to one of these pages
 * (or below it) is followed. tests/curated.test.ts keeps this list equal to the folders of app/[locale].
 */
export const WEB_ROUTE_ROOTS = [
  "ai", "appointments", "articles", "c", "cart", "chat", "community", "condition", "consultations", "dashboard", "delivery",
  "diagnostics", "doctor", "doctors", "drug-scanner", "emergency", "facility", "family", "health", "home-care", "home-nursing",
  "insurance", "labs", "loyalty", "map", "maternity", "medicine", "medicine-catalog", "medicines", "mental-health",
  "notifications", "nursing", "nutrition", "offers", "orders", "p", "payments", "pharmacies", "pharmacy", "prescriptions", "privacy",
  "profile", "programs", "provider-info", "radiology", "reminders", "reports", "returns", "reviews", "room", "s", "search",
  "services", "settings", "support", "terms", "voice", "wishlist",
] as const;

const SAFE_PATH = /^\/[A-Za-z0-9\-._~%/]*(\?[A-Za-z0-9\-._~%=&]*)?$/;

/**
 * The web link for a curated item's `deep_link`: an internal path under the page's own locale, or null (the card is then
 * shown without a link). A scheme, a host, `//`, backslashes, dot segments and unknown pages are refused.
 */
export function curatedHref(deepLink: string | null | undefined, locale: string): string | null {
  if (typeof deepLink !== "string") return null;
  const raw = deepLink.trim();
  if (raw.length === 0 || raw.length > 160 || raw.startsWith("//") || !SAFE_PATH.test(raw)) return null;
  const [pathPart, query] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) return null;
  if (segments.length > 0 && isLocale(segments[0])) segments.shift();
  if (segments.length === 0) return `/${locale}`;
  if (!(WEB_ROUTE_ROOTS as readonly string[]).includes(segments[0])) return null;
  return `/${locale}/${segments.join("/")}${query ? `?${query}` : ""}`;
}
