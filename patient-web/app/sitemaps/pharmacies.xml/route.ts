import { sitemapRoute, citySlugs, listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

// Dynamic: the feeds are cached in the Next data cache instead (a build without the backend must not fail).
export const dynamic = "force-dynamic";

/** Pharmacies: each public pharmacy (/{locale}/pharmacy/{slug}) and the pharmacies-by-city pages
 *  (/{locale}/pharmacies/{city}), six locales + x-default. */
export function GET() {
  return sitemapRoute(async () => {
    const [rows, cities] = await Promise.all([
      sitemapFeed("/public/sitemaps/pharmacies/ar").then((d) => listItems<{ slug: string; lastmod?: string }>(d)),
      citySlugs(),
    ]);
    return localizedSitemap([
      ...rows.filter((p) => p.slug).map((p) => ({ path: `/pharmacy/${encodeURIComponent(p.slug)}`, lastmod: p.lastmod, priority: "0.7" })),
      ...cities.map((c) => ({ path: `/pharmacies/${encodeURIComponent(c)}`, priority: "0.6" })),
    ]);
  });
}
