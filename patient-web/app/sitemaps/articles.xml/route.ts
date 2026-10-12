import { sitemapRoute, listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

// Dynamic: the feeds are cached in the Next data cache instead (a build without the backend must not fail).
export const dynamic = "force-dynamic";

/** Published health articles: /{locale}/articles/{slug}, six locales + x-default. */
export function GET() {
  return sitemapRoute(async () => {
    const rows = listItems<{ slug: string; lastmod?: string }>(await sitemapFeed("/public/sitemaps/articles/ar", 3600));
    return localizedSitemap(rows.filter((a) => a.slug).map((a) => ({ path: `/articles/${encodeURIComponent(a.slug)}`, lastmod: a.lastmod, priority: "0.7" })));
  });
}
