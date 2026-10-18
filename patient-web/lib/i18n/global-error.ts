import ar from "@/messages/ar.json";
import bn from "@/messages/bn.json";
import en from "@/messages/en.json";
import fil from "@/messages/fil.json";
import hi from "@/messages/hi.json";
import ur from "@/messages/ur.json";
import type { SiteLocale } from "@/lib/i18n/device-locale";

const COPIES: Record<SiteLocale, { RouteState: { errorTitle: string; errorBody: string; retry: string; returnHome: string } }> = { ar, en, ur, hi, bn, fil };
const RTL = new Set<SiteLocale>(["ar", "ur"]);

/** 15.5: the strings of the root error page, from the same message files as the rest of the site. */
export function getGlobalErrorCopy(locale: SiteLocale) {
  const copy = COPIES[locale].RouteState;
  return {
    dir: RTL.has(locale) ? ("rtl" as const) : ("ltr" as const),
    title: copy.errorTitle,
    body: copy.errorBody,
    retry: copy.retry,
    returnHome: copy.returnHome,
  };
}
