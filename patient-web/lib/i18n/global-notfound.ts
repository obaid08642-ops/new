import type { NotFoundHelpLabels } from "@/components-next/core/not-found-help";
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

/** 17.1: the search and popular-section labels of the not-found page, from the same messages (no request locale needed). */
export function getGlobalNotFoundHelp(locale: string): NotFoundHelpLabels {
  const copies = COPIES[locale] ?? COPIES.ar;
  const notFound = copies.NotFound;
  const search = copies.Search;
  return {
    searchLabel: notFound.searchLabel,
    searchButton: notFound.searchButton,
    popularTitle: notFound.popularTitle,
    searchPlaceholder: search.placeholder,
    category: {
      catPharmacy: search.catPharmacy,
      catConsult: search.catConsult,
      catLab: search.catLab,
      catRadiology: search.catRadiology,
      catNursing: search.catNursing,
      catMind: search.catMind,
    },
  };
}
