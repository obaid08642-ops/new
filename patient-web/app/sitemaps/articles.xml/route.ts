import { listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

export const revalidate = 3600;

/** Published health articles: /{locale}/articles/{slug}, six locales + x-default. */
export async function GET() {
  const rows = listItems<{ slug: string; lastmod?: string }>(await sitemapFeed("/public/sitemaps/articles/ar", 3600));
  return localizedSitemap(rows.filter((a) => a.slug).map((a) => ({ path: `/articles/${encodeURIComponent(a.slug)}`, lastmod: a.lastmod, priority: "0.7" })));
}
