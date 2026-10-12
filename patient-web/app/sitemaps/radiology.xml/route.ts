import { sitemapRoute, listItems, localizedSitemap, sitemapFeed } from "@/lib/sitemap";

// Dynamic: the feeds are cached in the Next data cache instead (a build without the backend must not fail).
export const dynamic = "force-dynamic";

/** Radiology: each reviewed service (/{locale}/diagnostics/radiology/{id}), six locales + x-default.
 *  The /radiology/{service}/{city} variants are not listed: their content does not depend on the
 *  city, so they point at the service page (canonical) and are not indexed. */
export function GET() {
  return sitemapRoute(async () => {
    const services = listItems<{ id?: string }>(await sitemapFeed<unknown>("/radiology/services?limit=100")).slice(0, 100);
    return localizedSitemap(services.filter((s) => s.id).map((s) => ({ path: `/diagnostics/radiology/${encodeURIComponent(String(s.id))}`, priority: "0.8" })));
  });
}
