import { citySlugs, listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

export const revalidate = 21600;

/** Pharmacies: each public pharmacy (/{locale}/pharmacy/{slug}) and the pharmacies-by-city pages
 *  (/{locale}/pharmacies/{city}), six locales + x-default. */
export async function GET() {
  const [rows, cities] = await Promise.all([
    sitemapFeed("/public/sitemaps/pharmacies/ar").then((d) => listItems<{ slug: string; lastmod?: string }>(d)),
    citySlugs(),
  ]);
  return localizedSitemap([
    ...rows.filter((p) => p.slug).map((p) => ({ path: `/pharmacy/${encodeURIComponent(p.slug)}`, lastmod: p.lastmod, priority: "0.7" })),
    ...cities.map((c) => ({ path: `/pharmacies/${encodeURIComponent(c)}`, priority: "0.6" })),
  ]);
}
