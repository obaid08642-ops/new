/**
 * Validates and cleans a districts extract (the file `scripts/geo/fetch-osm-districts.ts` writes) before it is committed as
 * `src/modules/location/data/districts-extract.v1.json`. A row is kept only with BOTH an Arabic and an English name, a point
 * inside the kingdom, a source, a known city, and no repeat of an earlier row of the same city (names compared the way the import
 * matches them). Rejected rows are counted by reason, never repaired.
 *
 * Run: npx ts-node --transpile-only scripts/geo/validate-districts-extract.ts <in.json> <out.json> [summary.md]
 */
import * as fs from 'fs';
import { normalizeDistrictName, planImport, type CityCounts, type ExistingRow, type ExtractNewCity } from '../../src/modules/location/districts-plan';
import { SAUDI_LOCATIONS_SEED } from '../../src/modules/location/seeds/saudi-locations.data';

/** A box around the kingdom (lat 16–32.5, lng 34.5–56); a point outside it is a mistake, not a district. */
export const KSA_BOX = { minLat: 16, maxLat: 32.5, minLng: 34.5, maxLng: 56 };

/** English names from OSM carry transliteration marks (a backtick or ʿayn/hamza modifier letters) and sometimes Arabic diacritics; none belongs in a name_en. */
export function cleanEnglishName(raw: string): string {
  return raw
    .replace(/[`´ʿʾʻʼ]/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type Reason = 'missing_name' | 'outside_kingdom' | 'no_source' | 'unknown_city' | 'duplicate';
export interface Row { city_code?: unknown; name_ar?: unknown; name_en?: unknown; lat?: unknown; lng?: unknown; source?: unknown }
export interface CleanRow { city_code: string; name_ar: string; name_en: string; lat: number; lng: number; source: string }

export interface CleanCity { code: string; lat: number; lng: number; source: string }

export type NewCityReason = 'bad_code' | 'missing_name' | 'unknown_region' | 'outside_kingdom' | 'no_source' | 'duplicate';
export const MACRO_REGIONS = new Set(['sa-central-region', 'sa-western-region', 'sa-eastern-region', 'sa-northern-region', 'sa-southern-region']);

/** The new cities of an extract that pass every rule (both names, a macro region, a point in the kingdom, a source, a fresh unique code). */
export function validateNewCities(input: unknown[] | undefined, seedCodes: Set<string>): { kept: ExtractNewCity[]; rejected: Record<NewCityReason, number>; cleanedEn: number } {
  const rejected: Record<NewCityReason, number> = { bad_code: 0, missing_name: 0, unknown_region: 0, outside_kingdom: 0, no_source: 0, duplicate: 0 };
  const kept: ExtractNewCity[] = []; const codes = new Set(seedCodes); const names = new Set<string>();
  let cleanedEn = 0;
  for (const n of (input ?? []) as Array<Record<string, unknown>>) {
    const code = typeof n?.code === 'string' ? n.code : '';
    if (!/^sa-[a-z0-9]+(-[a-z0-9]+)*$/.test(code) || codes.has(code)) { rejected.bad_code += 1; continue; }
    const ar = typeof n.name_ar === 'string' ? n.name_ar.trim() : '';
    const rawEn = typeof n.name_en === 'string' ? n.name_en.trim() : '';
    const en = cleanEnglishName(rawEn);
    if (en !== rawEn) cleanedEn += 1;
    if (!ar || !en) { rejected.missing_name += 1; continue; }
    if (typeof n.region_code !== 'string' || !MACRO_REGIONS.has(n.region_code)) { rejected.unknown_region += 1; continue; }
    const lat = n.lat; const lng = n.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < KSA_BOX.minLat || lat > KSA_BOX.maxLat || lng < KSA_BOX.minLng || lng > KSA_BOX.maxLng) { rejected.outside_kingdom += 1; continue; }
    const source = typeof n.source === 'string' ? n.source.trim() : '';
    if (!source) { rejected.no_source += 1; continue; }
    const key = `${normalizeDistrictName(ar)}|${normalizeDistrictName(en)}`;
    if (names.has(key)) { rejected.duplicate += 1; continue; }
    names.add(key); codes.add(code);
    kept.push({ code, name_ar: ar, name_en: en, region_code: n.region_code, lat, lng, source });
  }
  return { kept, rejected, cleanedEn };
}

export function validateExtract(input: { cities?: unknown[]; new_cities?: unknown[]; districts?: Row[] }, seedCityCodes: Set<string>, seedCodes: Set<string> = seedCityCodes): { kept: CleanRow[]; rejected: Record<Reason, number>; perCity: Record<string, { kept: number; rejected: number }>; cities: CleanCity[]; newCities: ExtractNewCity[]; newCityRejected: Record<NewCityReason, number>; cleanedEn: number } {
  const nc = validateNewCities(input.new_cities, seedCodes);
  const cityCodes = new Set([...seedCityCodes, ...nc.kept.map((n) => n.code)]);
  const rejected: Record<Reason, number> = { missing_name: 0, outside_kingdom: 0, no_source: 0, unknown_city: 0, duplicate: 0 };
  const perCity: Record<string, { kept: number; rejected: number }> = {};
  const kept: CleanRow[] = [];
  const seen = new Set<string>();
  let cleanedEn = nc.cleanedEn;
  const cities: CleanCity[] = [];
  for (const c of (input.cities ?? []) as Array<Record<string, unknown>>) {
    const lat = c?.lat; const lng = c?.lng; const code = typeof c?.code === 'string' ? c.code : '';
    const inBox = typeof lat === 'number' && typeof lng === 'number' && lat >= KSA_BOX.minLat && lat <= KSA_BOX.maxLat && lng >= KSA_BOX.minLng && lng <= KSA_BOX.maxLng;
    if (cityCodes.has(code) && inBox && typeof c.source === 'string' && c.source.trim() && !cities.some((x) => x.code === code)) cities.push({ code, lat: lat as number, lng: lng as number, source: c.source.trim() });
  }
  const bump = (city: string, k: 'kept' | 'rejected') => { (perCity[city] ||= { kept: 0, rejected: 0 })[k] += 1; };
  for (const r of input.districts ?? []) {
    const city = typeof r.city_code === 'string' ? r.city_code : '';
    const reject = (why: Reason) => { rejected[why] += 1; bump(city || '(none)', 'rejected'); };
    if (!cityCodes.has(city)) { reject('unknown_city'); continue; }
    const ar = typeof r.name_ar === 'string' ? r.name_ar.trim() : '';
    const rawEn = typeof r.name_en === 'string' ? r.name_en.trim() : '';
    const en = cleanEnglishName(rawEn);
    if (en !== rawEn) cleanedEn += 1;
    if (!ar || !en) { reject('missing_name'); continue; }
    const lat = r.lat; const lng = r.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < KSA_BOX.minLat || lat > KSA_BOX.maxLat || lng < KSA_BOX.minLng || lng > KSA_BOX.maxLng) { reject('outside_kingdom'); continue; }
    const source = typeof r.source === 'string' ? r.source.trim() : '';
    if (!source) { reject('no_source'); continue; }
    const keys = [`${city}|ar|${normalizeDistrictName(ar)}`, `${city}|en|${normalizeDistrictName(en)}`];
    if (keys.some((k) => seen.has(k))) { reject('duplicate'); continue; }
    keys.forEach((k) => seen.add(k));
    kept.push({ city_code: city, name_ar: ar, name_en: en, lat, lng, source });
    bump(city, 'kept');
  }
  return { kept, rejected, perCity, cities, newCities: nc.kept, newCityRejected: nc.rejected, cleanedEn };
}

export function summaryMarkdown(res: ReturnType<typeof validateExtract>, fetchReport: Record<string, unknown> = {}): string {
  const rows = Object.entries({ ...Object.fromEntries(Object.keys(fetchReport).map((c) => [c, { kept: 0, rejected: 0 }])), ...res.perCity }).sort(([a], [b]) => a.localeCompare(b));
  const lines = ['| city | kept | rejected | fetch |', '|---|---:|---:|---|'];
  for (const [city, c] of rows) lines.push(`| ${city} | ${c.kept} | ${c.rejected} | ${fetchReport[city] && (fetchReport[city] as { error?: unknown }).error ? `error ${(fetchReport[city] as { error: unknown }).error}` : 'ok'} |`);
  return [`**${res.kept.length} districts kept**; rejected: ${Object.entries(res.rejected).map(([k, v]) => `${k} ${v}`).join(', ')}`, '', ...lines].join('\n');
}

interface AssignmentReport {
  per_city?: Record<string, { boundary: number; nearest: number }>;
  totals?: { boundary: number; nearest: number; too_far: number; no_city_centre: number };
  centres?: { found: number; from_place: number; from_boundary: number };
  cities_without_centre?: string[]; conflicting_centres?: string[]; ambiguous_cities?: string[];
  new_cities?: { found: number; conflicting_codes: string[] };
}

/** The summary of a by-region run: per city, how many districts, by what rule they were assigned, how many are already in the seed (code kept) and how many are new. */
export function assignmentSummaryMarkdown(res: ReturnType<typeof validateExtract>, fetchReport: Record<string, unknown>, merge: CityCounts[]): string {
  const a = (fetchReport.assignment ?? {}) as AssignmentReport;
  const byCity = new Map(merge.map((m) => [m.city, m]));
  const centreOf = new Map(res.cities.map((c) => [c.code, c.source.startsWith('osm:relation/') ? 'boundary' : 'place']));
  const cityRows = [...new Set([...Object.keys(res.perCity), ...Object.keys(a.per_city ?? {}), ...res.cities.map((c) => c.code)])].sort();
  const lines = ['| city | kept | rejected | by boundary | nearest-city fallback | already in seed (code kept) | new | centre |', '|---|---:|---:|---:|---:|---:|---:|---|'];
  for (const city of cityRows) {
    const c = res.perCity[city] ?? { kept: 0, rejected: 0 }; const m = byCity.get(city); const p = a.per_city?.[city] ?? { boundary: 0, nearest: 0 };
    lines.push(`| ${city} | ${c.kept} | ${c.rejected} | ${p.boundary} | ${p.nearest} | ${m?.matched ?? 0} | ${m?.new ?? 0} | ${centreOf.get(city) ?? 'none'} |`);
  }
  const regions = Object.entries(fetchReport).filter(([k]) => k.startsWith('region:')).sort(([x], [y]) => x.localeCompare(y));
  const regionLines = ['| region | result |', '|---|---|', ...regions.map(([k, v]) => { const r = v as { error?: unknown; kept?: number; boundaries_error?: unknown; boundaries?: { used: number; unclosed: number } }; return `| ${k.slice(7)} | ${r.error ? `error ${r.error}` : `${r.kept} kept; ${r.boundaries?.used ?? 0} boundaries (${r.boundaries?.unclosed ?? 0} unclosed)${r.boundaries_error ? `; boundaries query failed: ${r.boundaries_error}` : ''}`} |`; })];
  const newByRegion = Object.entries(res.newCities.reduce<Record<string, number>>((m, n) => ({ ...m, [n.region_code]: (m[n.region_code] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(', ');
  const list = (title: string, v?: string[]) => (v?.length ? [`**${title} (${v.length}):** ${v.join(', ')}`] : []);
  return [
    `**${res.kept.length} districts kept**; rejected: ${Object.entries(res.rejected).map(([k, v]) => `${k} ${v}`).join(', ')}; English names cleaned: ${res.cleanedEn}`,
    `**Assignment:** by boundary ${a.totals?.boundary ?? 0}, nearest-city fallback ${a.totals?.nearest ?? 0}, rejected (too far from every city) ${a.totals?.too_far ?? 0}, rejected (no city centre in the region) ${a.totals?.no_city_centre ?? 0}`,
    `**City centres:** ${res.cities.length} found (${a.centres?.from_place ?? 0} from a place node, ${a.centres?.from_boundary ?? 0} from the middle of the city's boundary)`,
    ...list('Cities with no centre', a.cities_without_centre), ...list('Cities with two different centres (dropped)', a.conflicting_centres), ...list('Cities with several equally ranked places (dropped)', a.ambiguous_cities),
    `**New cities (in OpenStreetMap, not in the seed):** ${res.newCities.length}${newByRegion ? ` (${newByRegion})` : ''}; rejected: ${Object.entries(res.newCityRejected).map(([k, v]) => `${k} ${v}`).join(', ')}; two regions produced the same code (dropped): ${(a.new_cities?.conflicting_codes ?? []).join(', ') || 'none'}`,
    '', ...regionLines, '', ...lines,
  ].join('\n');
}

if (require.main === module) {
  const [inFile, outFile, summaryFile] = process.argv.slice(2);
  if (!inFile || !outFile) { console.error('usage: validate-districts-extract <in.json> <out.json> [summary.md]'); process.exit(2); }
  const cityCodes = new Set(SAUDI_LOCATIONS_SEED.filter((l) => l.type === 'city').map((l) => l.code));
  const res = validateExtract(JSON.parse(fs.readFileSync(inFile, 'utf8')), cityCodes, new Set(SAUDI_LOCATIONS_SEED.map((l) => l.code)));
  const reportFile = `${inFile}.report.json`;
  const fetchReport = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {};
  fs.writeFileSync(outFile, JSON.stringify({ cities: res.cities, new_cities: res.newCities, districts: res.kept }, null, 1));
  const existing: ExistingRow[] = SAUDI_LOCATIONS_SEED.map((l) => ({ code: l.code, name_ar: l.name_ar, name_en: l.name_en, type: l.type, parent_code: l.parent_code ?? null, coordinates: l.coordinates ?? null }));
  const merge = planImport(existing, { cities: res.cities, new_cities: res.newCities, districts: res.kept }).perCity;
  const md = fetchReport.assignment ? assignmentSummaryMarkdown(res, fetchReport, merge) : summaryMarkdown(res, fetchReport);
  if (summaryFile) fs.writeFileSync(summaryFile, md);
  console.log(md);
  process.exit(res.kept.length ? 0 : 1);
}
