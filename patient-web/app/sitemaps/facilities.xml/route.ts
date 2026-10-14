import { sitemapRoute, listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

// Dynamic: the feeds are cached in the Next data cache instead (a build without the backend must not fail).
export const dynamic = "force-dynamic";

/** Public hospitals and clinics: /{locale}/facility/{slug}, six locales + x-default. */
export function GET() {
  return sitemapRoute(async () => {
    const rows = listItems<{ slug: string; lastmod?: string }>(await sitemapFeed("/public/sitemaps/facilities/ar"));
    return localizedSitemap(rows.filter((f) => f.slug).map((f) => ({ path: `/facility/${encodeURIComponent(f.slug)}`, lastmod: f.lastmod, changefreq: "monthly", priority: "0.7" })));
  });
}
