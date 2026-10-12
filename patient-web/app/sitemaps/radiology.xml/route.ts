import { listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

export const revalidate = 21600;

/** Radiology: each reviewed service (/{locale}/diagnostics/radiology/{id}), six locales + x-default.
 *  The /radiology/{service}/{city} variants are not listed: their content does not depend on the
 *  city, so they point at the service page (canonical) and are not indexed. */
export async function GET() {
  const services = listItems<{ id?: string }>(await sitemapFeed<unknown>("/radiology/services?limit=100")).slice(0, 100);
  return localizedSitemap(services.filter((s) => s.id).map((s) => ({ path: `/diagnostics/radiology/${encodeURIComponent(String(s.id))}`, priority: "0.8" })));
}
