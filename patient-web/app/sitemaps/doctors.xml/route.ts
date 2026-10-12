import { listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

export const revalidate = 21600;

/** Public, reviewed, index-eligible doctors: /{locale}/doctor/{slug}, six locales + x-default.
 *  The /doctor/{slug}/{city} variants are not listed: they repeat the same doctor for any city. */
export async function GET() {
  const doctors = listItems<{ slug: string; lastmod?: string }>(await sitemapFeed("/public/sitemaps/doctors/ar"));
  return localizedSitemap(doctors.filter((d) => d.slug).map((d) => ({ path: `/doctor/${encodeURIComponent(d.slug)}`, lastmod: d.lastmod, priority: "0.85" })));
}
