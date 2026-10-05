import { isLocale, type Locale } from "@/lib/i18n";

/**
 * The same page in another language: swaps only the leading locale segment (/ar/search -> /en/search).
 * A path without a locale segment is prefixed. The query string and hash are kept by the caller (they are
 * only known in the browser), see LocaleSelector.
 */
export function pathInLocale(pathname: string, target: Locale): string {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const [, first = "", ...rest] = clean.split("/");
  const tail = isLocale(first) ? rest : [first, ...rest];
  const joined = tail.filter((segment, index) => segment !== "" || index < tail.length - 1).join("/");
  return joined ? `/${target}/${joined}` : `/${target}`;
}
