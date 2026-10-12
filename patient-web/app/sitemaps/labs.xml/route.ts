import { citySlugs, listItems, localizedSitemap, MAX_SITEMAP_URLS, sitemapFeed } from "@/lib/sitemap";
import { locales } from "@/lib/i18n";

export const revalidate = 21600;

/** Lab tests by city: /{locale}/labs/{test}/{city} for the reviewed lab catalogue (no invented
 *  fallback list), six locales + x-default, within the 50,000-URL limit. */
export async function GET() {
  const [data, cities] = await Promise.all([sitemapFeed<unknown>("/labs/services?limit=100"), citySlugs()]);
  const tests = listItems<{ slug?: string; short_code?: string; id?: string }>(data).map((x) => x.slug || x.short_code || x.id).filter((t): t is string => Boolean(t)).slice(0, 100);
  const perTest = Math.max(1, Math.floor(MAX_SITEMAP_URLS / locales.length / Math.max(tests.length, 1)));
  return localizedSitemap(tests.flatMap((t) => cities.slice(0, perTest).map((c) => ({ path: `/labs/${encodeURIComponent(t)}/${encodeURIComponent(c)}`, priority: "0.7" }))));
}
