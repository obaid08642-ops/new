import { locales, type Locale } from "@/lib/i18n";

export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");
}

export function localizedUrl(locale: Locale, path = "") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}/${locale}${path === "" ? "" : suffix}`;
}

function escXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** xhtml:link hreflang alternates for one path across all 6 locales (sitemaps). */
export function hreflangLinks(path: string) {
  return locales.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${escXml(localizedUrl(l, path))}" />`).join("");
}

export const SITEMAP_NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"';
