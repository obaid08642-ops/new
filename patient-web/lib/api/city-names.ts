/**
 * City names in the page's language. A provider row stores its city as free text (Arabic), while the public city list
 * (GET /locations/cities) holds each city with its Arabic and English name. Names of catalogue data are kept in Arabic and
 * English only (owner decision 2026-10-25): the Arabic page shows the city as stored, every other page (Urdu, Hindi, Bengali and
 * Filipino included) shows the English name.
 */
export type CityRow = { en: string };
export type CityNames = Record<string, CityRow>;

const clean = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);

/** Arabic name -> the city's English name, from the rows of /locations/cities. */
export function extractCityNames(payload: unknown): CityNames {
  const rows = Array.isArray(payload) ? payload : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: unknown[] }).data : [];
  const out: CityNames = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const ar = clean(r.name_ar);
    const en = clean(r.name_en);
    if (ar && en && r.is_active !== false && r.is_deleted !== true) out[ar] = { en };
  }
  return out;
}

/** The city as the page's language shows it; a city the list does not know is shown as stored. */
export function cityLabel(locale: string, city: string | undefined, names: CityNames | undefined): string | undefined {
  if (!city) return undefined;
  if (locale === "ar") return city;
  return names?.[city.trim()]?.en ?? city;
}
