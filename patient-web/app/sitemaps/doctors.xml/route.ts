import { sitemapRoute, listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

// Dynamic: the feeds are cached in the Next data cache instead (a build without the backend must not fail).
export const dynamic = "force-dynamic";

/** Public, reviewed, index-eligible doctors: /{locale}/doctor/{slug}, six locales + x-default.
 *  The /doctor/{slug}/{city} variants are not listed: they repeat the same doctor for any city. */
export function GET() {
  return sitemapRoute(async () => {
    const doctors = listItems<{ slug: string; lastmod?: string }>(await sitemapFeed("/public/sitemaps/doctors/ar"));
    return localizedSitemap(doctors.filter((d) => d.slug).map((d) => ({ path: `/doctor/${encodeURIComponent(d.slug)}`, lastmod: d.lastmod, priority: "0.85" })));
  });
}
