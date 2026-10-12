import { listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

export const revalidate = 21600;

/** Medical conditions: /{locale}/condition/{code}, six locales + x-default. */
export async function GET() {
  const rows = listItems<{ slug: string; lastmod?: string }>(await sitemapFeed("/public/sitemaps/conditions/ar"));
  return localizedSitemap(rows.filter((c) => c.slug).map((c) => ({ path: `/condition/${encodeURIComponent(c.slug)}`, lastmod: c.lastmod, changefreq: "monthly", priority: "0.6" })));
}
