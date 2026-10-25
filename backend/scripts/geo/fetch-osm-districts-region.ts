/**
 * One Overpass query per administrative REGION (admin_level 4, picked by its ISO 3166-2 tag), not one per city: the 13 regions are 13
 * queries instead of ~150, so a run finishes in minutes. Every neighbourhood/suburb/quarter of the region (nodes and ways, `out center`) is
 * assigned to the NEAREST of our cities of that region, by the centre of the city's own OSM place node (matched by its Arabic or English name);
 * a place farther than `--max-km` (default 40) from every city centre is counted, not guessed. A place is kept only with BOTH an Arabic and an
 * English name (nothing is transliterated), as in `fetch-osm-districts.ts`, whose row builder this reuses.
 *
 * A failed region never loses the others: the script ALWAYS writes `--out` (an empty list for a failed region) and `<out>.report.json`
 * with the error, and exits 0 so the workflow can upload the partial artifact; the merge step lists the failed regions.
 *
 * Run: npx ts-node --transpile-only scripts/geo/fetch-osm-districts-region.ts --region=SA-01 --out=/tmp/part-SA-01.json [--gap-ms=12000] [--max-km=40]
 */
import * as fs from 'fs';
import { haversineM } from '../../src/modules/geo/geo-math';
import { normalizeDistrictName } from '../../src/modules/location/districts-plan';
import { SAUDI_LOCATIONS_SEED } from '../../src/modules/location/seeds/saudi-locations.data';
import { overpassToRows, type OsmElement, type OutDistrict } from './fetch-osm-districts';

/** The 13 regions of the kingdom by ISO 3166-2 (SA-13 is not used). */
export const REGIONS: ReadonlyArray<{ iso: string; name_en: string }> = [
  { iso: 'SA-01', name_en: 'Riyadh' }, { iso: 'SA-02', name_en: 'Makkah' }, { iso: 'SA-03', name_en: 'Madinah' },
  { iso: 'SA-04', name_en: 'Eastern Province' }, { iso: 'SA-05', name_en: 'Qassim' }, { iso: 'SA-06', name_en: 'Hail' },
  { iso: 'SA-07', name_en: 'Tabuk' }, { iso: 'SA-08', name_en: 'Northern Borders' }, { iso: 'SA-09', name_en: 'Jazan' },
  { iso: 'SA-10', name_en: 'Najran' }, { iso: 'SA-11', name_en: 'Al Bahah' }, { iso: 'SA-12', name_en: 'Al Jawf' },
  { iso: 'SA-14', name_en: 'Asir' },
];

const DISTRICT_PLACES = new Set(['suburb', 'neighbourhood', 'quarter']);
const CITY_PLACES = new Set(['city', 'town', 'village']);

export function regionQuery(iso: string, timeoutS = 600): string {
  if (!/^SA-\d{2}$/.test(iso)) throw new Error(`bad region code: ${iso}`);
  return `[out:json][timeout:${timeoutS}];rel["boundary"="administrative"]["admin_level"="4"]["ISO3166-2"="${iso}"];map_to_area->.r;(node(area.r)["place"~"^(suburb|neighbourhood|quarter)$"];way(area.r)["place"~"^(suburb|neighbourhood|quarter)$"];node(area.r)["place"~"^(city|town|village)$"];way(area.r)["place"~"^(city|town|village)$"];);out center tags;`;
}

export interface SeedCity { code: string; name_ar: string; name_en: string }
export type RegionSkipped = { no_ar_or_en_name: number; no_point: number; duplicate: number; too_far: number; no_city_centre: number };

const pointOf = (e: OsmElement) => {
  const lat = e.lat ?? e.center?.lat; const lng = e.lon ?? e.center?.lon;
  return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
};

/** The region's answer → rows per city; also the cities of ours that had no place node (so they got no district) for the report. */
export function regionToRows(elements: OsmElement[], cities: SeedCity[], maxKm = 40): { rows: OutDistrict[]; skipped: RegionSkipped; cities_without_centre: string[] } {
  const skipped: RegionSkipped = { no_ar_or_en_name: 0, no_point: 0, duplicate: 0, too_far: 0, no_city_centre: 0 };
  const byName = new Map<string, SeedCity>();
  for (const c of cities) {
    byName.set(normalizeDistrictName(c.name_ar.replace(/^(مدينة)\s+/, '')), c);
    byName.set(normalizeDistrictName(c.name_en), c);
  }
  const centres = new Map<string, { lat: number; lng: number }>();
  const places: OsmElement[] = [];
  for (const e of elements ?? []) {
    const kind = e.tags?.place;
    if (kind && CITY_PLACES.has(kind)) {
      const p = pointOf(e);
      const keys = [e.tags?.['name:ar'], e.tags?.['name:en'], e.tags?.name].filter((v): v is string => !!v).map(normalizeDistrictName);
      const city = keys.map((k) => byName.get(k)).find(Boolean);
      if (p && city && !centres.has(city.code)) centres.set(city.code, p);
    } else if (kind && DISTRICT_PLACES.has(kind)) places.push(e);
  }
  const grouped = new Map<string, OsmElement[]>();
  for (const e of places) {
    const p = pointOf(e);
    if (!p) { skipped.no_point += 1; continue; }
    if (!centres.size) { skipped.no_city_centre += 1; continue; }
    let best: { code: string; m: number } | null = null;
    for (const [code, c] of centres) {
      const m = haversineM(p, c);
      if (!best || m < best.m) best = { code, m };
    }
    if (!best || best.m > maxKm * 1000) { skipped.too_far += 1; continue; }
    grouped.set(best.code, [...(grouped.get(best.code) ?? []), e]);
  }
  const rows: OutDistrict[] = [];
  for (const [code, els] of grouped) {
    const r = overpassToRows(code, els);
    rows.push(...r.rows);
    skipped.no_ar_or_en_name += r.skipped.no_ar_or_en_name; skipped.duplicate += r.skipped.duplicate; skipped.no_point += r.skipped.no_point;
  }
  return { rows, skipped, cities_without_centre: cities.filter((c) => !centres.has(c.code)).map((c) => c.code) };
}

/** POST with a per-attempt timeout; network errors, timeouts and 429/5xx are retried with a growing wait. Returns the parsed answer or the error text. */
export async function queryOverpass(endpoint: string, ua: string, query: string, opts: { attempts: number; attemptTimeoutMs: number; gapMs: number; fetchImpl?: typeof fetch }): Promise<{ elements?: OsmElement[]; error?: string }> {
  const doFetch = opts.fetchImpl ?? fetch;
  let last = 'no attempt';
  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      const res = await doFetch(endpoint, { method: 'POST', headers: { 'User-Agent': ua, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}`, signal: AbortSignal.timeout(opts.attemptTimeoutMs) });
      if (res.ok) return (await res.json()) as { elements?: OsmElement[] };
      last = `http ${res.status}`;
      if (![429, 502, 503, 504].includes(res.status)) return { error: last };
    } catch (e) {
      last = (e as Error)?.name === 'TimeoutError' ? `timeout after ${opts.attemptTimeoutMs} ms` : `network: ${(e as Error)?.message ?? e}`;
    }
    if (attempt < opts.attempts) await new Promise((r) => setTimeout(r, opts.gapMs * 2 * attempt));
  }
  return { error: `${last} (after ${opts.attempts} attempts)` };
}

async function main() {
  const arg = (n: string) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
  const region = arg('region'); const out = arg('out');
  if (!region || !out) throw new Error('--region=SA-01 and --out=<file.json> are required');
  if (!REGIONS.some((r) => r.iso === region)) throw new Error(`unknown region ${region}`);
  const gapMs = Number(arg('gap-ms')) || 12000; const maxKm = Number(arg('max-km')) || 40;
  const attemptTimeoutMs = (Number(arg('attempt-timeout-s')) || 900) * 1000;
  const cities = SAUDI_LOCATIONS_SEED.filter((l) => l.type === 'city' && l.is_active);
  const ua = process.env.GEO_USER_AGENT || 'NabdPlus-backend/1.0 (+https://nabd.plus)';
  const endpoint = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
  const result: { cities: never[]; districts: OutDistrict[] } = { cities: [], districts: [] };
  const report: Record<string, unknown> = {};
  try {
    const answer = await queryOverpass(endpoint, ua, regionQuery(region), { attempts: 3, attemptTimeoutMs, gapMs });
    if (answer.error) report[`region:${region}`] = { error: answer.error };
    else {
      const { rows, skipped, cities_without_centre } = regionToRows(answer.elements ?? [], cities, maxKm);
      result.districts.push(...rows);
      const perCity: Record<string, number> = {};
      for (const r of rows) perCity[r.city_code] = (perCity[r.city_code] ?? 0) + 1;
      report[`region:${region}`] = { kept: rows.length, ...skipped, cities_with_districts: Object.keys(perCity).length, cities_without_centre: cities_without_centre.length };
    }
  } catch (e) {
    report[`region:${region}`] = { error: (e as Error)?.message ?? String(e) };
  }
  // Always written, even for a failed region: the workflow uploads it as a partial result.
  fs.writeFileSync(out, JSON.stringify(result, null, 1));
  fs.writeFileSync(`${out}.report.json`, JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ region, districts: result.districts.length, report }));
}

if (require.main === module) {
  main().catch((e) => { console.error(e?.message || e); process.exit(1); });
}
