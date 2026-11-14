import { citySlugs, listItems, sitemapFeed } from "@/lib/sitemap";
import { citiesOf, publicNursingServices, serviceTokens } from "@/lib/nursing/service-pages";

export type CatalogueEntry = { path: string; lastmod?: string; priority?: string };

const MAX_FEED_PAGES = 30;
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined);

/** Every row of a catalogue feed that answers `{ data, total_pages }` when asked for a page (an older answer that is a plain list is returned as it is). */
export async function allCatalogueRows<T>(path: string, pageSize = 100): Promise<T[]> {
  const first = await sitemapFeed<unknown>(`${path}?page=1&limit=${pageSize}`);
  const rows = listItems<T>(first);
  const pages = Math.min(Number((first as { total_pages?: number } | null)?.total_pages) || 1, MAX_FEED_PAGES);
  for (let p = 2; p <= pages; p++) rows.push(...listItems<T>(await sitemapFeed<unknown>(`${path}?page=${p}&limit=${pageSize}`)));
  return rows;
}

/**
 * Lab tests by city: /labs/{test}/{city} for every reviewed test of the catalogue, including a test no lab offers yet (the page shows "notify me").
 * All pages of the catalogue are read: the sitemap used to stop at the first 100 tests.
 */
export async function labSitemapEntries(): Promise<CatalogueEntry[]> {
  const [rows, cities] = await Promise.all([
    allCatalogueRows<{ slug?: string; short_code?: string; id?: string; updatedAt?: string; updated_at?: string }>("/labs/services"),
    citySlugs(),
  ]);
  const tests = rows
    .map((x) => ({ token: x.slug || x.short_code || x.id, lastmod: day(x.updatedAt ?? x.updated_at) }))
    .filter((t): t is { token: string; lastmod: string | undefined } => Boolean(t.token));
  return tests.flatMap((t) => cities.map((c) => ({ path: `/labs/${encodeURIComponent(t.token)}/${encodeURIComponent(c)}`, lastmod: t.lastmod, priority: "0.7" })));
}

/** Home nursing by service and city: /home-nursing/{city}/{service} for every approved catalogue service, whether or not a nurse offers it yet. */
export async function nursingSitemapEntries(): Promise<CatalogueEntry[]> {
  const [data, cityData] = await Promise.all([sitemapFeed<unknown>("/home-care/services"), sitemapFeed<unknown>("/locations/cities")]);
  const cities = citiesOf(cityData).map((c) => c.slug).slice(0, 150);
  const tokens = serviceTokens(publicNursingServices(data)).map((x) => x.token);
  return tokens.flatMap((t) => cities.map((c) => ({ path: `/home-nursing/${encodeURIComponent(c)}/${encodeURIComponent(t)}`, priority: "0.6" })));
}
