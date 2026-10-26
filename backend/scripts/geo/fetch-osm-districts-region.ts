/**
 * Two Overpass queries per administrative REGION (admin_level 4, picked by its ISO 3166-2 tag), not one per city: 13 regions instead of ~150
 * cities, so a run finishes in minutes. Query 1: every neighbourhood/suburb/quarter of the region plus its city/town/village nodes (the
 * centres of OUR cities, which the seed has none of). Query 2: the governorate/municipality boundaries (admin_level 6–8) with their outlines.
 * A district goes to the city whose boundary contains it; without one, to the nearest city centre within `--max-km` (default 25); farther is
 * rejected with a reason (see district-assign.ts). A place is kept only with BOTH an Arabic and an English name (nothing is transliterated).
 *
 * A failed region never loses the others: the script ALWAYS writes `--out` (empty for a failed region) and `<out>.report.json` with the error,
 * and exits 0 so the workflow can upload the partial artifact; the merge step lists the failed regions. If only the boundaries query fails,
 * the region is still built from city centres alone and the report says so.
 *
 * Run: npx ts-node --transpile-only scripts/geo/fetch-osm-districts-region.ts --region=SA-01 --out=/tmp/part-SA-01.json [--gap-ms=12000] [--max-km=25]
 */
import * as fs from 'fs';
import { SAUDI_LOCATIONS_SEED } from '../../src/modules/location/seeds/saudi-locations.data';
import { overpassToRows, type OutDistrict } from './fetch-osm-districts';
import { assignPoint, buildBoundaries, pointOf, resolveCentres, type AssignedBy, type OsmAny, type OsmTagged, type SeedCity } from './district-assign';

/** The 13 regions of the kingdom by ISO 3166-2 (SA-13 is not used). */
export const REGIONS: ReadonlyArray<{ iso: string; name_en: string }> = [
  { iso: 'SA-01', name_en: 'Riyadh' }, { iso: 'SA-02', name_en: 'Makkah' }, { iso: 'SA-03', name_en: 'Madinah' },
  { iso: 'SA-04', name_en: 'Eastern Province' }, { iso: 'SA-05', name_en: 'Qassim' }, { iso: 'SA-06', name_en: 'Hail' },
  { iso: 'SA-07', name_en: 'Tabuk' }, { iso: 'SA-08', name_en: 'Northern Borders' }, { iso: 'SA-09', name_en: 'Jazan' },
  { iso: 'SA-10', name_en: 'Najran' }, { iso: 'SA-11', name_en: 'Al Bahah' }, { iso: 'SA-12', name_en: 'Al Jawf' },
  { iso: 'SA-14', name_en: 'Asir' },
];

const DISTRICT_PLACES = new Set(['suburb', 'neighbourhood', 'quarter']);

/** The places of the region: neighbourhoods to assign, and the city/town/village nodes that give our cities their centres. */
export function regionQuery(iso: string, timeoutS = 600): string {
  if (!/^SA-\d{2}$/.test(iso)) throw new Error(`bad region code: ${iso}`);
  return `[out:json][timeout:${timeoutS}];rel["boundary"="administrative"]["admin_level"="4"]["ISO3166-2"="${iso}"];map_to_area->.r;(node(area.r)["place"~"^(suburb|neighbourhood|quarter)$"];way(area.r)["place"~"^(suburb|neighbourhood|quarter)$"];node(area.r)["place"~"^(city|town|village)$"];way(area.r)["place"~"^(city|town|village)$"];);out center tags;`;
}

/**
 * The governorate / municipality boundaries (admin_level 6–8) of the region, with their outlines, to decide which city contains a district.
 * `out geom;` and NOT `out geom tags;`: with the `tags` modifier Overpass prints the tags (and bounds) only, no members, so no ring could
 * ever be assembled and every district fell back to the nearest city (the first by-region run: "by boundary 0", all relations unclosed).
 */
export function regionBoundariesQuery(iso: string, timeoutS = 600): string {
  if (!/^SA-\d{2}$/.test(iso)) throw new Error(`bad region code: ${iso}`);
  return `[out:json][timeout:${timeoutS}];rel["boundary"="administrative"]["admin_level"="4"]["ISO3166-2"="${iso}"];map_to_area->.r;rel(area.r)["boundary"="administrative"]["admin_level"~"^(6|7|8)$"];out geom;`;
}

export type RegionSkipped = { no_ar_or_en_name: number; no_point: number; duplicate: number; too_far: number; no_city_centre: number };
export interface RegionResult {
  rows: OutDistrict[];
  cities: Array<{ code: string; lat: number; lng: number; source: string }>;
  skipped: RegionSkipped;
  per_city: Record<string, { boundary: number; nearest: number }>;
  centre_from: Record<string, 'place' | 'boundary'>;
  ambiguous_cities: string[];
  cities_without_centre: string[];
  boundaries: { used: number; unclosed: number };
}

/** The region's answers → rows per city, the centres found for our cities, and what was assigned how; nothing is guessed. */
export function regionToRows(elements: OsmAny[], cities: SeedCity[], maxKm = 25): RegionResult {
  const { boundaries, unclosed } = buildBoundaries(elements);
  const res = resolveCentres(elements, boundaries, cities);
  const skipped: RegionSkipped = { no_ar_or_en_name: 0, no_point: 0, duplicate: 0, too_far: 0, no_city_centre: 0 };
  const grouped = new Map<string, OsmTagged[]>();
  const how = new Map<string, AssignedBy>();
  for (const e of elements) {
    if (e.type === 'relation' || !e.tags?.place || !DISTRICT_PLACES.has(e.tags.place)) continue;
    const p = pointOf(e);
    if (!p) { skipped.no_point += 1; continue; }
    const out = assignPoint(p, res, maxKm);
    if ('rejected' in out) { skipped[out.rejected] += 1; continue; }
    grouped.set(out.city, [...(grouped.get(out.city) ?? []), e]);
    how.set(`osm:${e.type}/${e.id}`, out.by);
  }
  const rows: OutDistrict[] = [];
  const per_city: RegionResult['per_city'] = {};
  for (const [code, els] of grouped) {
    const r = overpassToRows(code, els);
    rows.push(...r.rows);
    skipped.no_ar_or_en_name += r.skipped.no_ar_or_en_name; skipped.duplicate += r.skipped.duplicate; skipped.no_point += r.skipped.no_point;
    for (const row of r.rows) {
      const by = how.get(row.source) as AssignedBy;
      (per_city[code] ||= { boundary: 0, nearest: 0 })[by] += 1;
    }
  }
  const centre_from: RegionResult['centre_from'] = {};
  for (const [code, c] of res.centres) centre_from[code] = c.from;
  return {
    rows, skipped, per_city, centre_from,
    cities: [...res.centres].map(([code, c]) => ({ code, lat: c.lat, lng: c.lng, source: c.source })),
    ambiguous_cities: res.ambiguous,
    cities_without_centre: res.missing,
    boundaries: { used: boundaries.length, unclosed },
  };
}

/** The public Overpass instances, tried in turn: one busy mirror answers 502 "at capacity" for minutes while another is free. */
export const DEFAULT_OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
];

export interface OverpassOptions {
  attempts: number;
  attemptTimeoutMs: number;
  gapMs: number;
  /** longest wait between two attempts; the wait doubles each attempt up to this */
  maxWaitMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

/** The wait before attempt n+1: gap · 2^n, capped, with ±20% jitter so parallel runs do not retry in step. */
export function backoffMs(attempt: number, gapMs: number, maxWaitMs: number, random: () => number = Math.random): number {
  const base = Math.min(maxWaitMs, gapMs * 2 ** attempt);
  return Math.round(base * (0.8 + 0.4 * random()));
}

/**
 * POST with a per-attempt timeout. Network errors, timeouts, 429/502/503/504 and a 200 whose body says "runtime error" (Overpass answers a
 * query it had to abandon that way, with partial or no elements) are retried with a growing wait, rotating through the endpoints. Returns the
 * parsed answer or the last error text; never throws.
 */
export async function queryOverpass(endpoints: string | string[], ua: string, query: string, opts: OverpassOptions): Promise<{ elements?: OsmAny[]; error?: string }> {
  const list = Array.isArray(endpoints) ? endpoints : [endpoints];
  const doFetch = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const maxWait = opts.maxWaitMs ?? 300_000;
  let last = 'no attempt';
  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    const endpoint = list[(attempt - 1) % list.length];
    try {
      const res = await doFetch(endpoint, { method: 'POST', headers: { 'User-Agent': ua, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}`, signal: AbortSignal.timeout(opts.attemptTimeoutMs) });
      if (res.ok) {
        const body = (await res.json()) as { elements?: OsmAny[]; remark?: string };
        if (typeof body.remark === 'string' && /runtime error/i.test(body.remark)) last = `overpass: ${body.remark.slice(0, 120)}`;
        else return body;
      } else {
        last = `http ${res.status}`;
        if (![429, 502, 503, 504].includes(res.status)) return { error: last };
      }
    } catch (e) {
      last = (e as Error)?.name === 'TimeoutError' ? `timeout after ${opts.attemptTimeoutMs} ms` : `network: ${(e as Error)?.message ?? e}`;
    }
    if (attempt < opts.attempts) await sleep(backoffMs(attempt, opts.gapMs, maxWait, opts.random));
  }
  return { error: `${last} (after ${opts.attempts} attempts)` };
}

async function main() {
  const arg = (n: string) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
  const region = arg('region'); const out = arg('out');
  if (!region || !out) throw new Error('--region=SA-01 and --out=<file.json> are required');
  if (!REGIONS.some((r) => r.iso === region)) throw new Error(`unknown region ${region}`);
  const gapMs = Number(arg('gap-ms')) || 12000; const maxKm = Number(arg('max-km')) || 25;
  const attemptTimeoutMs = (Number(arg('attempt-timeout-s')) || 900) * 1000;
  const attempts = Number(arg('attempts')) || 7;
  const cities: SeedCity[] = SAUDI_LOCATIONS_SEED.filter((l) => l.type === 'city' && l.is_active);
  const ua = process.env.GEO_USER_AGENT || 'NabdPlus-backend/1.0 (+https://nabd.plus)';
  const endpoints = (process.env.OVERPASS_URL || '').split(',').map((v) => v.trim()).filter(Boolean);
  if (!endpoints.length) endpoints.push(...DEFAULT_OVERPASS_ENDPOINTS);
  const result: { cities: RegionResult['cities']; districts: OutDistrict[] } = { cities: [], districts: [] };
  const report: Record<string, unknown> = {};
  try {
    const places = await queryOverpass(endpoints, ua, regionQuery(region), { attempts, attemptTimeoutMs, gapMs });
    if (places.error) report[`region:${region}`] = { error: places.error };
    else {
      await new Promise((r) => setTimeout(r, gapMs));
      const bounds = await queryOverpass(endpoints, ua, regionBoundariesQuery(region), { attempts, attemptTimeoutMs, gapMs });
      const r = regionToRows([...(places.elements ?? []), ...(bounds.elements ?? [])], cities, maxKm);
      result.districts.push(...r.rows);
      result.cities.push(...r.cities);
      report[`region:${region}`] = {
        kept: r.rows.length, ...r.skipped,
        ...(bounds.error ? { boundaries_error: bounds.error } : {}),
        boundaries: r.boundaries,
        cities_with_centre: r.cities.length,
        centre_from: r.centre_from,
        ambiguous_cities: r.ambiguous_cities,
        cities_without_centre: r.cities_without_centre,
        per_city: r.per_city,
      };
    }
  } catch (e) {
    report[`region:${region}`] = { error: (e as Error)?.message ?? String(e) };
  }
  // Always written, even for a failed region: the workflow uploads it as a partial result.
  fs.writeFileSync(out, JSON.stringify(result, null, 1));
  fs.writeFileSync(`${out}.report.json`, JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ region, districts: result.districts.length, cities: result.cities.length, report: Object.values(report)[0] && { ...(Object.values(report)[0] as object), per_city: undefined, cities_without_centre: undefined } }));
}

if (require.main === module) {
  main().catch((e) => { console.error(e?.message || e); process.exit(1); });
}
