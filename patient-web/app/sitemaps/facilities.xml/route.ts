import { listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

export const revalidate = 21600;

/** Public hospitals and clinics: /{locale}/facility/{slug}, six locales + x-default. */
export async function GET() {
  const rows = listItems<{ slug: string; lastmod?: string }>(await sitemapFeed("/public/sitemaps/facilities/ar"));
  return localizedSitemap(rows.filter((f) => f.slug).map((f) => ({ path: `/facility/${encodeURIComponent(f.slug)}`, lastmod: f.lastmod, changefreq: "monthly", priority: "0.7" })));
}
