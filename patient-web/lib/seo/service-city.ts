/**
 * Q33: one resolver for /[locale]/services/[serviceSlug]/[citySlug], shared by
 * the page, the proxy (real HTTP 404 before streaming starts) and the services
 * sitemap, so a URL is emitted, rendered and answered 200 only when the NAMED
 * service is listed in that city's catalog feed.
 *
 * Sources: GET /api/v1/locations/cities ({ code: 'sa-riyadh', name_ar, name_en })
 * and GET /api/v1/public/ai-catalog/services?city=<Arabic name>
 * (backend ai-commerce getServiceFeed: id, slug, name, city, ... per public,
 * approved provider/facility).
 */
export type ServiceFeedItem = {
  id?: string;
  slug?: string;
  name?: string;
  specialty?: string;
  serviceType?: string;
  facilityType?: string;
  city?: string;
  acceptedInsurance?: string[];
  url?: string;
  deepLink?: string;
};

export type ResolvedCity = { latin: string; arabic: string; english: string };
export type Fetcher = (url: string) => Promise<Response>;

type GeoCity = { code?: unknown; name_ar?: unknown; name_en?: unknown };

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** The catalog could not be read (network/5xx): not the same as "not found". */
export class ServiceCatalogUnavailable extends Error {
  constructor(url: string) { super(`service_catalog_unavailable: ${url}`); }
}

async function json(fetcher: Fetcher, url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetcher(url);
  } catch {
    throw new ServiceCatalogUnavailable(url);
  }
  if (!res.ok) throw new ServiceCatalogUnavailable(url);
  const body = await res.json().catch(() => undefined);
  if (body === undefined) throw new ServiceCatalogUnavailable(url);
  return body;
}

/** All cities with a latin slug and an Arabic name (the catalog filters on Arabic names). */
export async function listCities(apiBase: string, fetcher: Fetcher): Promise<ResolvedCity[]> {
  const data = await json(fetcher, `${apiBase}/api/v1/locations/cities`);
  const list: GeoCity[] = Array.isArray(data) ? data : Array.isArray((data as { data?: unknown })?.data) ? (data as { data: GeoCity[] }).data : [];
  return list
    .map((c) => ({ latin: str(c.code).replace(/^sa-/, "").toLowerCase(), arabic: str(c.name_ar), english: str(c.name_en) || str(c.name_ar) }))
    .filter((c) => c.latin && c.arabic && !c.latin.includes("-"));
}

export async function resolveCity(apiBase: string, citySlug: string, fetcher: Fetcher): Promise<ResolvedCity | null> {
  let decoded = citySlug;
  try { decoded = decodeURIComponent(citySlug); } catch { /* keep raw */ }
  const wanted = decoded.trim().toLowerCase();
  if (!wanted) return null;
  const cities = await listCities(apiBase, fetcher);
  return cities.find((c) => c.latin === wanted) ?? null;
}

/** The city's catalog feed rows that carry a real slug (only those get a URL). */
export async function cityServices(apiBase: string, city: ResolvedCity, locale: string, fetcher: Fetcher): Promise<ServiceFeedItem[]> {
  const data = await json(fetcher, `${apiBase}/api/v1/public/ai-catalog/services?city=${encodeURIComponent(city.arabic)}&locale=${encodeURIComponent(locale)}`);
  const items = Array.isArray((data as { items?: unknown })?.items) ? (data as { items: unknown[] }).items : [];
  return items.filter((item): item is ServiceFeedItem => {
    if (!item || typeof item !== "object") return false;
    const row = item as ServiceFeedItem;
    return !!str(row.slug) && !!str(row.name);
  });
}

export type NamedService = { item: ServiceFeedItem; city: ResolvedCity; cityName: string; title: string };

/** City name in the page locale: Arabic for `ar`, the English name otherwise. */
export function cityNameFor(city: ResolvedCity, locale: string): string {
  return locale === "ar" ? city.arabic : city.english;
}

/**
 * The named service in that city, or null (unknown city, unknown service, a
 * service not offered in that city, or a row without a slug/name). Throws
 * ServiceCatalogUnavailable when the backend cannot be read.
 */
export async function findNamedService(apiBase: string, serviceSlug: string, citySlug: string, locale: string, fetcher: Fetcher): Promise<NamedService | null> {
  const city = await resolveCity(apiBase, citySlug, fetcher);
  if (!city) return null;
  let slug = serviceSlug;
  try { slug = decodeURIComponent(serviceSlug); } catch { /* keep raw */ }
  const wanted = slug.trim().toLowerCase();
  const items = await cityServices(apiBase, city, locale, fetcher);
  const item = items.find((row) => str(row.slug).toLowerCase() === wanted);
  if (!item) return null;
  const cityName = cityNameFor(city, locale);
  const name = str(item.name);
  return { item, city, cityName, title: locale === "ar" ? `${name} في ${cityName}` : `${name} in ${cityName}` };
}

const LOCALES = "(?:ar|en|ur|hi|bn|fil)";
const SERVICE_CITY_PATH = new RegExp(`^\\/(${LOCALES})\\/services\\/([^/]+)\\/([^/]+)\\/?$`);

/** Matches /{locale}/services/{serviceSlug}/{citySlug}. */
export function matchServiceCityPath(pathname: string): { locale: string; serviceSlug: string; citySlug: string } | null {
  const m = SERVICE_CITY_PATH.exec(pathname);
  return m ? { locale: m[1], serviceSlug: m[2], citySlug: m[3] } : null;
}
