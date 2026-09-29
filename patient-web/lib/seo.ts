import { locales, type Locale } from "@/lib/i18n";

export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");
}

export function localizedUrl(locale: Locale, path = "") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}/${locale}${path === "" ? "" : suffix}`;
}

/** Escape for XML text *and* attribute values (quotes included: values go into href="…"). */
export function escXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** xhtml:link hreflang alternates for one path across all 6 locales (sitemaps). */
export function hreflangLinks(path: string) {
  return locales.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${escXml(localizedUrl(l, path))}" />`).join("");
}

/** hreflang for entities whose slug differs per locale (products): each alternate is that locale's
 *  canonical URL, plus x-default → Arabic (the site default), matching the page's own <link>s. */
export function hreflangLinksPerLocale(pathFor: (locale: Locale) => string | null) {
  const links = locales
    .map((l) => ({ l, path: pathFor(l) }))
    .filter((x): x is { l: Locale; path: string } => Boolean(x.path))
    .map(({ l, path }) => `<xhtml:link rel="alternate" hreflang="${l}" href="${escXml(localizedUrl(l, path))}" />`);
  const def = pathFor("ar");
  if (def) links.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${escXml(localizedUrl("ar", def))}" />`);
  return links.join("");
}

export const SITEMAP_NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"';

export const DEFAULT_OG_IMAGE = "/images/og-default.jpg";

/** Absolute URL for the default social share image (1200x630). */
export function defaultOgImage(): string {
  return `${siteOrigin()}${DEFAULT_OG_IMAGE}`;
}

/**
 * Complete hub-page metadata: indexable + canonical + per-page hreflang
 * (6 locales) + default OG image + twitter card. Use in generateMetadata
 * of every public landing page so no page inherits the layout noindex.
 */
export function hubMetadata(locale: Locale, path: string, title: string, description: string) {
  const canonical = localizedUrl(locale, path);
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, path)])),
        "x-default": localizedUrl("ar", path),
      },
    },
    openGraph: {
      type: "website" as const,
      url: canonical,
      title,
      description,
      siteName: "Nabd Plus",
      images: [{ url: defaultOgImage(), width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image" as const, title, description, images: [defaultOgImage()] },
    robots: { index: true, follow: true },
  };
}
