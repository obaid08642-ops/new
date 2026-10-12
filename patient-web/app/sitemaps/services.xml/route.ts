import { citySlugs, listItems, localizedSitemap, MAX_SITEMAP_URLS, sitemapFeed } from "@/lib/sitemap";
import { locales } from "@/lib/i18n";

export const revalidate = 21600;

/** Home nursing by city (/{locale}/home-nursing/{city}) and catalogue services by city
 *  (/{locale}/services/{service}/{city}), six locales + x-default. */
export async function GET() {
  const [data, cities] = await Promise.all([sitemapFeed<unknown>("/public/ai-catalog/services"), citySlugs()]);
  // Feed uses `id` (+optional slug); skip unidentifiable rows instead of emitting /undefined/.
  const ids = listItems<{ service_id?: string; slug?: string; id?: string }>(data).map((i) => i.service_id || i.slug || i.id).filter((x): x is string => Boolean(x));
  const perService = Math.max(1, Math.floor((MAX_SITEMAP_URLS / locales.length - cities.length) / Math.max(ids.length, 1)));
  return localizedSitemap([
    ...cities.map((c) => ({ path: `/home-nursing/${encodeURIComponent(c)}`, priority: "0.7" })),
    ...ids.flatMap((sid) => cities.slice(0, perService).map((c) => ({ path: `/services/${encodeURIComponent(sid)}/${encodeURIComponent(c)}`, priority: "0.6" }))),
  ]);
}
