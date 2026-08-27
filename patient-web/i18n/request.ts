import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const base = (await import("../messages/en.json")).default;
  const localized = (await import(`../messages/${locale}.json`)).default;
  const messages = Object.fromEntries(Object.entries(base).map(([namespace, value]) => [namespace, typeof value === "object" && value && !Array.isArray(value) ? { ...value, ...(localized[namespace as keyof typeof localized] || {}) } : localized[namespace as keyof typeof localized] || value]));
  return { locale, messages };
});
