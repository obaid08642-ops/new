import { sitemapRoute, listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

// Dynamic: the feeds are cached in the Next data cache instead (a build without the backend must not fail).
export const dynamic = "force-dynamic";

/** Medical conditions: /{locale}/condition/{code}, six locales + x-default. */
export function GET() {
  return sitemapRoute(async () => {
    const rows = listItems<{ slug: string; lastmod?: string }>(await sitemapFeed("/public/sitemaps/conditions/ar"));
    return localizedSitemap(rows.filter((c) => c.slug).map((c) => ({ path: `/condition/${encodeURIComponent(c.slug)}`, lastmod: c.lastmod, changefreq: "monthly", priority: "0.6" })));
  });
}
