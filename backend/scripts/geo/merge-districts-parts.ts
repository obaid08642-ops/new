/**
 * Merges the per-region parts (`part-SA-xx.json` + `.report.json`, written by fetch-osm-districts-region.ts) into one raw extract (districts and the centres found for our cities, with the assignment counts in the report) that
 * `validate-districts-extract.ts` reads (`<out>` and `<out>.report.json`). A missing or unreadable part is reported as an error for its
 * region, never skipped silently. Exits 0 even when some regions failed: the failures are in the report and the summary.
 *
 * Run: npx ts-node --transpile-only scripts/geo/merge-districts-parts.ts <dir-with-parts> <out.json>
 */
import * as fs from 'fs';
import * as path from 'path';
import { SAUDI_LOCATIONS_SEED } from '../../src/modules/location/seeds/saudi-locations.data';
import { distanceM } from './district-assign';
import { MACRO_REGION_OF_ISO, REGIONS } from './fetch-osm-districts-region';

type PartCity = { code: string; lat: number; lng: number; source: string };
export type PartNewCity = PartCity & { name_ar: string; name_en: string; region_code: string; iso?: string };
export interface Assignment {
  per_city: Record<string, { boundary: number; nearest: number }>;
  totals: { boundary: number; nearest: number; too_far: number; no_city_centre: number };
  centres: { found: number; from_place: number; from_boundary: number };
  /** cities with no centre in any region (so nothing could reach them by distance), and cities two regions disagreed on */
  cities_without_centre: string[];
  conflicting_centres: string[];
  ambiguous_cities: string[];
  /** cities of OpenStreetMap the seed lacks: how many each region found, and the codes two regions both produced (dropped with their districts) */
  new_cities: { found: number; conflicting_codes: string[] };
}

export function mergeParts(dir: string): { merged: { cities: PartCity[]; new_cities: PartNewCity[]; districts: unknown[] }; report: Record<string, unknown> } {
  const merged: { cities: PartCity[]; new_cities: PartNewCity[]; districts: unknown[] } = { cities: [], new_cities: [], districts: [] };
  const newByCode = new Map<string, PartNewCity[]>();
  const report: Record<string, unknown> = {};
  const files = fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map(String) : [];
  const centres = new Map<string, PartCity[]>();
  const centreIso = new Map<PartCity, string>();
  const assignment: Assignment = {
    per_city: {}, totals: { boundary: 0, nearest: 0, too_far: 0, no_city_centre: 0 },
    centres: { found: 0, from_place: 0, from_boundary: 0 }, cities_without_centre: [], conflicting_centres: [], ambiguous_cities: [], new_cities: { found: 0, conflicting_codes: [] },
  };
  const ambiguous = new Set<string>();
  for (const { iso } of REGIONS) {
    const part = files.find((f) => path.basename(f) === `part-${iso}.json`);
    if (!part) { report[`region:${iso}`] = { error: 'part missing (the region job did not upload)' }; continue; }
    try {
      const body = JSON.parse(fs.readFileSync(path.join(dir, part), 'utf8')) as { districts?: unknown[]; cities?: PartCity[]; new_cities?: PartNewCity[] };
      merged.districts.push(...(body.districts ?? []));
      for (const n of body.new_cities ?? []) newByCode.set(n.code, [...(newByCode.get(n.code) ?? []), n]);
      for (const c of body.cities ?? []) { centres.set(c.code, [...(centres.get(c.code) ?? []), c]); centreIso.set(c, iso); }
      const rep = path.join(dir, `${part}.report.json`);
      const partReport = fs.existsSync(rep) ? JSON.parse(fs.readFileSync(rep, 'utf8')) : { [`region:${iso}`]: { error: 'report missing' } };
      Object.assign(report, partReport);
      const r = partReport[`region:${iso}`] as { per_city?: Assignment['per_city']; too_far?: number; no_city_centre?: number; ambiguous_cities?: string[]; centre_from?: Record<string, string> } | undefined;
      for (const [code, n] of Object.entries(r?.per_city ?? {})) {
        const t = (assignment.per_city[code] ||= { boundary: 0, nearest: 0 });
        t.boundary += n.boundary; t.nearest += n.nearest;
        assignment.totals.boundary += n.boundary; assignment.totals.nearest += n.nearest;
      }
      assignment.totals.too_far += r?.too_far ?? 0; assignment.totals.no_city_centre += r?.no_city_centre ?? 0;
      for (const c of r?.ambiguous_cities ?? []) ambiguous.add(c);
    } catch (e) {
      report[`region:${iso}`] = { error: `unreadable part: ${(e as Error).message}` };
    }
  }
  // A city whose centre two regions disagree on (a homonym place in another region) is dropped, not guessed.
  const conflicting = new Set<string>();
  // ... unless exactly one of the places lies in a region that belongs to the city's own macro region (a seed city of the north is not the
  // homonym town of the west): that one is the city's centre.
  const macroOf = new Map(SAUDI_LOCATIONS_SEED.filter((l) => l.type === 'city').map((l) => [l.code, l.parent_code]));
  for (const [code, list] of centres) {
    if (!list.some((c) => distanceM(list[0], c) > 2000)) { merged.cities.push(list[0]); continue; }
    const own = list.filter((c) => MACRO_REGION_OF_ISO[centreIso.get(c) as string] === macroOf.get(code));
    if (own.length && own.every((c) => distanceM(own[0], c) <= 2000) && own.length < list.length) merged.cities.push(own[0]);
    else conflicting.add(code);
  }
  // a new city two regions both produced (same code) is dropped with its districts: they cannot be told apart
  const clashing = new Set<string>();
  for (const [code, list] of newByCode) {
    if (list.length > 1) clashing.add(code);
    else merged.new_cities.push(list[0]);
  }
  assignment.new_cities = { found: merged.new_cities.length, conflicting_codes: [...clashing].sort() };
  assignment.conflicting_centres = [...conflicting].sort();
  assignment.centres.found = merged.cities.length;
  assignment.centres.from_place = merged.cities.filter((c) => !c.source.startsWith('osm:relation/')).length;
  assignment.centres.from_boundary = assignment.centres.found - assignment.centres.from_place;
  const have = new Set(merged.cities.map((c) => c.code));
  assignment.cities_without_centre = SAUDI_LOCATIONS_SEED.filter((l) => l.type === 'city' && l.is_active && !have.has(l.code)).map((l) => l.code);
  assignment.ambiguous_cities = [...ambiguous].filter((c) => !have.has(c)).sort();
  report.assignment = assignment;
  return { merged, report };
}

if (require.main === module) {
  const [dir, out] = process.argv.slice(2);
  if (!dir || !out) { console.error('usage: merge-districts-parts <dir> <out.json>'); process.exit(2); }
  const { merged, report } = mergeParts(dir);
  fs.writeFileSync(out, JSON.stringify(merged, null, 1));
  fs.writeFileSync(`${out}.report.json`, JSON.stringify(report, null, 1));
  const failed = Object.entries(report).filter(([k, v]) => k.startsWith('region:') && (v as { error?: unknown }).error);
  console.log(JSON.stringify({ districts: merged.districts.length, cities: merged.cities.length, new_cities: merged.new_cities.length, failed_regions: failed.map(([k]) => k) }));
}
