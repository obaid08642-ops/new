import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import ur from "@/messages/ur.json";
import hi from "@/messages/hi.json";
import bn from "@/messages/bn.json";
import fil from "@/messages/fil.json";

const COPIES: Record<string, any> = { ar, en, ur, hi, bn, fil };
const RTL = new Set(["ar", "ur"]);

export function getGlobalNotFoundCopy(requestedLocale: string | null) {
  const locale = requestedLocale && COPIES[requestedLocale] ? requestedLocale : "ar";
  return { locale, copy: COPIES[locale].NotFound, dir: RTL.has(locale) ? "rtl" : "ltr" };
}
