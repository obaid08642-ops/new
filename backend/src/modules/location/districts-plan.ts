/**
 * The pure planner of the districts import (owner item, 2026-10-25): which existing districts get a centroid and which new ones are
 * inserted, from an extract. Nothing here touches a database; the migration script
 * (`scripts/migrations/2026-10-districts-import.ts`) and the catalogue-apply task (`src/scripts/catalogue-apply.ts`) both use it.
 */
export interface ExtractDistrict { city_code: string; name_ar: string; name_en: string; lat: number; lng: number; source: string; source_url?: string }
export interface ExtractCity { code: string; lat: number; lng: number; source: string }
export interface Extract { cities?: ExtractCity[]; districts: ExtractDistrict[] }
export interface ExistingRow { code: string; name_ar: string; name_en: string; type: string; parent_code?: string | null; coordinates?: { lat?: number; lng?: number } | null }

export type CityCounts = { city: string; existing: number; extract: number; matched: number; centroid_fills: number; already_has_centroid: number; new: number; rejected: number };
export interface Plan {
  fills: Array<{ code: string; lat: number; lng: number; source: string }>;
  inserts: Array<{ code: string; city_code: string; name_ar: string; name_en: string; lat: number; lng: number; source: string; source_url?: string }>;
  cityFills: Array<{ code: string; lat: number; lng: number; source: string }>;
  rejected: Array<{ city_code: string; name: string; reason: string }>;
  perCity: CityCounts[];
}

/** One comparable form of a district name: no «حي» / "district", no «ال» / "Al ", no diacritics or punctuation, folded case. */
export function normalizeDistrictName(raw: string): string {
  return String(raw || '')
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/\b(district|neighbou?rhood|quarter)\b/g, ' ')
    .replace(/(^|\s)حي\s+/g, ' ')
    .replace(/(^|\s)(al|el|ash|as|an|ar|at|ad|az|adh)[\s-]+/g, ' ')
    .replace(/(^|\s)ال(?=\S)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

const validPoint = (lat: unknown, lng: unknown) => typeof lat === 'number' && typeof lng === 'number' && lat >= 16 && lat <= 32.5 && lng >= 34 && lng <= 56;

export function planImport(existing: ExistingRow[], extract: Extract): Plan {
  const cities = new Map(existing.filter((r) => r.type === 'city').map((r) => [r.code, r]));
  const districtsByCity = new Map<string, ExistingRow[]>();
  for (const r of existing) if (r.type === 'district' && r.parent_code) districtsByCity.set(r.parent_code, [...(districtsByCity.get(r.parent_code) ?? []), r]);
  const plan: Plan = { fills: [], inserts: [], cityFills: [], rejected: [], perCity: [] };

  for (const c of extract.cities ?? []) {
    const row = cities.get(c.code);
    if (row && validPoint(c.lat, c.lng) && c.source && !(row.coordinates && typeof row.coordinates.lat === 'number')) plan.cityFills.push({ code: c.code, lat: c.lat, lng: c.lng, source: c.source });
  }

  const byCity = new Map<string, ExtractDistrict[]>();
  for (const d of extract.districts ?? []) byCity.set(d.city_code, [...(byCity.get(d.city_code) ?? []), d]);
  const cityCodes = new Set<string>([...cities.keys(), ...byCity.keys()]);
  for (const cityCode of [...cityCodes].sort()) {
    const counts: CityCounts = { city: cityCode, existing: districtsByCity.get(cityCode)?.length ?? 0, extract: byCity.get(cityCode)?.length ?? 0, matched: 0, centroid_fills: 0, already_has_centroid: 0, new: 0, rejected: 0 };
    const known = new Map<string, ExistingRow>();
    let maxSeq = 0;
    for (const r of districtsByCity.get(cityCode) ?? []) {
      for (const n of [r.name_ar, r.name_en]) { const k = normalizeDistrictName(n); if (k) known.set(k, r); }
      const m = new RegExp(`^${cityCode}-(\\d+)$`).exec(r.code);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
    }
    const seen = new Set<string>();
    const reject = (d: ExtractDistrict, reason: string) => { plan.rejected.push({ city_code: cityCode, name: d.name_en || d.name_ar || '', reason }); counts.rejected += 1; };
    for (const d of byCity.get(cityCode) ?? []) {
      if (!cities.has(cityCode)) { reject(d, 'unknown_city'); continue; }
      if (!d.name_ar?.trim() || !d.name_en?.trim()) { reject(d, 'name_required'); continue; }
      if (!validPoint(d.lat, d.lng)) { reject(d, 'invalid_point'); continue; }
      if (!d.source?.trim()) { reject(d, 'source_required'); continue; }
      const keys = [normalizeDistrictName(d.name_ar), normalizeDistrictName(d.name_en)].filter(Boolean);
      if (keys.some((k) => seen.has(k))) { reject(d, 'duplicate_in_extract'); continue; }
      keys.forEach((k) => seen.add(k));
      const hit = keys.map((k) => known.get(k)).find(Boolean);
      if (hit) {
        counts.matched += 1;
        if (hit.coordinates && typeof hit.coordinates.lat === 'number') counts.already_has_centroid += 1;
        else { plan.fills.push({ code: hit.code, lat: d.lat, lng: d.lng, source: d.source }); counts.centroid_fills += 1; }
      } else {
        maxSeq += 1;
        const code = `${cityCode}-${String(maxSeq).padStart(3, '0')}`;
        plan.inserts.push({ code, city_code: cityCode, name_ar: d.name_ar.trim(), name_en: d.name_en.trim(), lat: d.lat, lng: d.lng, source: d.source, ...(d.source_url ? { source_url: d.source_url } : {}) });
        keys.forEach((k) => known.set(k, { code, name_ar: d.name_ar, name_en: d.name_en, type: 'district', parent_code: cityCode }));
        counts.new += 1;
      }
    }
    plan.perCity.push(counts);
  }
  return plan;
}
