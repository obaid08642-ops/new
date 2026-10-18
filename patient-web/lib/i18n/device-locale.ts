// Rule 6 (owner, 2026-10-06): the language follows the device. A page path without a locale goes to the
// first language the device prefers that the site has; a device that lists languages but none of them supported gets
// English; a device with no language at all (crawlers, sending no Accept-Language) gets Arabic. A choice the user made
// (the NEXT_LOCALE cookie) wins over the device, and a locale in the URL wins over both (see proxy.ts).
export const SITE_LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;
export type SiteLocale = (typeof SITE_LOCALES)[number];

export const DEFAULT_LOCALE: SiteLocale = "ar";
export const UNSUPPORTED_DEVICE_LOCALE: SiteLocale = "en";

function isSiteLocale(value: string): value is SiteLocale {
  return (SITE_LOCALES as readonly string[]).includes(value);
}

/** Language tag to site locale: the primary subtag, with the Tagalog tag mapped to Filipino. */
function toSiteLocale(tag: string): SiteLocale | null {
  const primary = tag.toLowerCase().split("-")[0];
  const mapped = primary === "tl" ? "fil" : primary;
  return isSiteLocale(mapped) ? mapped : null;
}

/** The Accept-Language entries, highest quality first, without `*` and without entries of quality 0. */
function rankedTags(acceptLanguage: string): string[] {
  return acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const quality = qParam === undefined ? 1 : Number(qParam.slice(2));
      return { tag: tag.trim(), quality };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.quality > 0 && !Number.isNaN(entry.quality))
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.tag);
}

/**
 * The locale a device asks for. `null` when the request says nothing about language (no header, or only `*`),
 * so the caller falls back to the default.
 */
export function deviceLocale(acceptLanguage: string | null): SiteLocale | null {
  if (!acceptLanguage) return null;
  const tags = rankedTags(acceptLanguage);
  if (tags.length === 0) return null;
  for (const tag of tags) {
    const locale = toSiteLocale(tag);
    if (locale) return locale;
  }
  return UNSUPPORTED_DEVICE_LOCALE;
}

/** The locale a locale-less page path is sent to: the remembered choice, else the device, else Arabic. */
export function chooseLocale(cookieLocale: string | undefined, acceptLanguage: string | null): SiteLocale {
  if (cookieLocale && isSiteLocale(cookieLocale)) return cookieLocale;
  return deviceLocale(acceptLanguage) ?? DEFAULT_LOCALE;
}
