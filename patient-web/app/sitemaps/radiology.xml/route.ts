import { citySlugs, listItems, localizedSitemap, MAX_SITEMAP_URLS, sitemapFeed } from "@/lib/sitemap";
import { locales } from "@/lib/i18n";

export const revalidate = 21600;

/** Radiology: each reviewed service (/{locale}/diagnostics/radiology/{id}) and the service-by-city
 *  pages (/{locale}/radiology/{service}/{city}), six locales + x-default. No invented fallback list. */
export async function GET() {
  const [data, cities] = await Promise.all([sitemapFeed<unknown>("/radiology/services?limit=100"), citySlugs()]);
  const services = listItems<{ id?: string; slug?: string; short_code?: string }>(data).slice(0, 100);
  const token = (s: { id?: string; slug?: string; short_code?: string }) =>
    String(s.slug || s.short_code || s.id || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const perService = Math.max(1, Math.floor(MAX_SITEMAP_URLS / locales.length / Math.max(services.length, 1)) - 1);
  return localizedSitemap([
    ...services.filter((s) => s.id).map((s) => ({ path: `/diagnostics/radiology/${encodeURIComponent(String(s.id))}`, priority: "0.8" })),
    ...services.filter((s) => token(s)).flatMap((s) => cities.slice(0, perService).map((c) => ({ path: `/radiology/${token(s)}/${encodeURIComponent(c)}`, priority: "0.7" }))),
  ]);
}
