import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

export function getGlobalNotFoundCopy(requestedLocale: string | null) {
  const locale = requestedLocale === "en" ? "en" : "ar";
  return { locale, copy: (locale === "en" ? en : ar).NotFound };
}
