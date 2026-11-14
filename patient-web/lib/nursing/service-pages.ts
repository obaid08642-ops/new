import { extractHomeCareServices, type HomeCareService } from "@/lib/api/home-care-services";
import type { Locale } from "@/lib/i18n";

/**
 * The public home-nursing service pages: /{locale}/home-nursing/{city}/{service} (one per approved catalogue service and city).
 * The catalogue rows come from GET /home-care/services (public: approved, active, not deleted, with what nurses offer for each).
 * Defence in depth on top of that filter: a row the catalogue marks as merged into another (`merged_into`, catalogue-duplicates) or
 * deleted never gets a page, and two rows with the same name count once, so the sitemap never lists a duplicate.
 */

type Row = Record<string, unknown>;
const asRows = (payload: unknown): Row[] => {
  const list = Array.isArray(payload) ? payload : payload && typeof payload === "object" ? ((payload as Row).data ?? (payload as Row).items ?? (payload as Row).services) : [];
  return Array.isArray(list) ? (list.filter((r) => r && typeof r === "object" && !Array.isArray(r)) as Row[]) : [];
};

const nameKey = (r: Row) => String(r.name_en ?? r.name_ar ?? r.name ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/** The slug of a name: lower case ASCII words joined by "-" ("Medical Injections (IV/IM)" -> "medical-injections-iv-im"); "" when the name has no ASCII letters or digits. */
export const slugOf = (name: string | undefined) => (name ?? "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Approved, non-duplicate catalogue services, in the order the catalogue sent them (the first of two rows with one name is kept). */
export function publicNursingServices(payload: unknown): HomeCareService[] {
  const seen = new Set<string>();
  const rows = asRows(payload).filter((r) => {
    if (r.is_deleted === true || r.merged_into || r.active === false) return false;
    if (typeof r.medical_review_status === "string" && r.medical_review_status !== "approved") return false;
    const key = nameKey(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return extractHomeCareServices(rows);
}

/**
 * The URL token of each service: its own slug, else the slug of its English name, else its id. A token another service already took
 * falls back to the id, so no two pages share a URL. Returned in the services' order.
 */
export function serviceTokens(services: readonly HomeCareService[]): Array<{ token: string; service: HomeCareService }> {
  const taken = new Set<string>();
  return services.map((service) => {
    const wanted = [service.slug, slugOf(service.nameEn)].find((t): t is string => Boolean(t) && !taken.has(t as string));
    const token = wanted ?? service.id;
    taken.add(token);
    return { token, service };
  });
}

/** The service a URL token names (its token, its id, or its own slug), or null: a page exists only for a real catalogue service. */
export function serviceForToken(services: readonly HomeCareService[], token: string): { token: string; service: HomeCareService } | null {
  const want = token.toLowerCase();
  const all = serviceTokens(services);
  return all.find((x) => x.token.toLowerCase() === want) ?? all.find((x) => x.service.id.toLowerCase() === want || x.service.slug?.toLowerCase() === want) ?? null;
}

/** The price range nurses offer a service at (from the offers of GET /home-care/services/:id, cheapest first); undefined when no offer has a price. */
export function priceRange(offers: ReadonlyArray<{ price?: number; currency: string }> | undefined): { low: number; high: number; currency: string; count: number } | undefined {
  const priced = (offers ?? []).filter((o): o is { price: number; currency: string } => typeof o.price === "number" && o.price > 0);
  if (priced.length === 0) return undefined;
  const prices = priced.map((o) => o.price);
  return { low: Math.min(...prices), high: Math.max(...prices), currency: priced[0].currency || "SAR", count: priced.length };
}

type CityRow = { code?: string; name_ar?: string; name_en?: string; is_deleted?: boolean };
export type City = { slug: string; nameAr?: string; nameEn?: string };

/** The cities of GET /locations/cities by their URL slug (the code without "sa-"), the same rule as the sitemaps. */
export function citiesOf(payload: unknown): City[] {
  const list = Array.isArray(payload) ? payload : payload && typeof payload === "object" ? ((payload as Row).items ?? (payload as Row).data) : [];
  const seen = new Set<string>();
  const out: City[] = [];
  for (const c of (Array.isArray(list) ? list : []) as CityRow[]) {
    const slug = String(c?.code ?? "").replace(/^sa-/, "").toLowerCase();
    if (!slug || c.is_deleted === true || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, nameAr: c.name_ar, nameEn: c.name_en });
  }
  return out;
}

/** The name of a city in the page's language: Arabic in Arabic, the English name elsewhere, the slug as the last resort. */
export function cityName(locale: Locale, city: City | undefined, slug: string): string {
  if (!city) return slug;
  return (locale === "ar" ? city.nameAr ?? city.nameEn : city.nameEn ?? city.nameAr) ?? slug;
}
