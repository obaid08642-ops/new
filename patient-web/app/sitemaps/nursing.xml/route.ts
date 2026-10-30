import { sitemapRoute, localizedSitemap, MAX_SITEMAP_URLS, sitemapFeed } from "@/lib/sitemap";
import { locales } from "@/lib/i18n";
import { citiesOf, publicNursingServices, serviceTokens } from "@/lib/nursing/service-pages";

// Dynamic: the feeds are cached in the Next data cache instead (a build without the backend must not fail).
export const dynamic = "force-dynamic";

/** Home nursing by service and city: /{locale}/home-nursing/{city}/{service} for the approved, non-duplicate catalogue services
 *  (GET /home-care/services), six locales + hreflang + x-default, within the 50,000-URL limit. Nothing is invented when the backend is down (503). */
export function GET() {
  return sitemapRoute(async () => {
    // the cities the page itself accepts (a deleted city is a 404 there, so it is not listed here)
    const [data, cityData] = await Promise.all([sitemapFeed<unknown>("/home-care/services"), sitemapFeed<unknown>("/locations/cities")]);
    const cities = citiesOf(cityData).map((c) => c.slug).slice(0, 150);
    const tokens = serviceTokens(publicNursingServices(data)).map((x) => x.token);
    const perService = Math.max(1, Math.floor(MAX_SITEMAP_URLS / locales.length / Math.max(tokens.length, 1)));
    return localizedSitemap(tokens.flatMap((t) => cities.slice(0, perService).map((c) => ({ path: `/home-nursing/${encodeURIComponent(c)}/${encodeURIComponent(t)}`, priority: "0.6" }))));
  });
}
