/**
 * City names in the page's language. A provider row stores its city as free text (Arabic), while the public city list
 * (GET /locations/cities) holds each city with its Arabic and English name. The map and the doctor lists draw the city of a
 * provider: on an English, Hindi, Bengali or Filipino page it is the English name (the list holds no other language yet),
 * on an Arabic or Urdu page the Arabic one.
 */
export type CityNames = Record<string, string>;

/** Arabic name -> English name, from the rows of /locations/cities. */
export function extractCityNames(payload: unknown): CityNames {
  const rows = Array.isArray(payload) ? payload : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: unknown[] }).data : [];
  const out: CityNames = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const ar = typeof r.name_ar === "string" ? r.name_ar.trim() : "";
    const en = typeof r.name_en === "string" ? r.name_en.trim() : "";
    if (ar && en && r.is_active !== false && r.is_deleted !== true) out[ar] = en;
  }
  return out;
}

/** The city as the page's language shows it; a city the list does not know is shown as stored. */
export function cityLabel(locale: string, city: string | undefined, names: CityNames | undefined): string | undefined {
  if (!city) return undefined;
  if (locale === "ar" || locale === "ur") return city;
  return names?.[city.trim()] ?? city;
}
