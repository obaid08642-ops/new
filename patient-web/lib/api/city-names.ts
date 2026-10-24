/**
 * City names in the page's language. A provider row stores its city as free text (Arabic), while the public city list
 * (GET /locations/cities) holds each city with its Arabic and English name and, where the data has them, the Urdu, Hindi,
 * Bengali and Filipino (`name_tl`) ones. The map and the doctor lists draw the city of a provider in the page's language: its
 * own translation, else the English name (Hindi, Bengali, Filipino, English), else the Arabic as stored (Arabic and Urdu).
 */
export type CityRow = { en: string; ur?: string; hi?: string; bn?: string; tl?: string };
export type CityNames = Record<string, CityRow>;

const clean = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);

/** Arabic name -> the city's names, from the rows of /locations/cities. */
export function extractCityNames(payload: unknown): CityNames {
  const rows = Array.isArray(payload) ? payload : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: unknown[] }).data : [];
  const out: CityNames = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const ar = clean(r.name_ar);
    const en = clean(r.name_en);
    if (ar && en && r.is_active !== false && r.is_deleted !== true) out[ar] = { en, ur: clean(r.name_ur), hi: clean(r.name_hi), bn: clean(r.name_bn), tl: clean(r.name_tl) };
  }
  return out;
}

/** The city as the page's language shows it; a city the list does not know is shown as stored. */
export function cityLabel(locale: string, city: string | undefined, names: CityNames | undefined): string | undefined {
  if (!city) return undefined;
  if (locale === "ar") return city;
  const row = names?.[city.trim()];
  if (!row) return city;
  if (locale === "ur") return row.ur ?? city;
  if (locale === "hi") return row.hi ?? row.en;
  if (locale === "bn") return row.bn ?? row.en;
  if (locale === "fil") return row.tl ?? row.en;
  return row.en;
}
