/**
 * Validates and cleans a districts extract (the file `scripts/geo/fetch-osm-districts.ts` writes) before it is committed as
 * `src/modules/location/data/districts-extract.v1.json`. A row is kept only with BOTH an Arabic and an English name, a point
 * inside the kingdom, a source, a known city, and no repeat of an earlier row of the same city (names compared the way the import
 * matches them). Rejected rows are counted by reason, never repaired.
 *
 * Run: npx ts-node --transpile-only scripts/geo/validate-districts-extract.ts <in.json> <out.json> [summary.md]
 */
import * as fs from 'fs';
import { normalizeDistrictName } from '../../src/modules/location/districts-plan';
import { SAUDI_LOCATIONS_SEED } from '../../src/modules/location/seeds/saudi-locations.data';

/** A box around the kingdom (lat 16–32.5, lng 34.5–56); a point outside it is a mistake, not a district. */
export const KSA_BOX = { minLat: 16, maxLat: 32.5, minLng: 34.5, maxLng: 56 };

export type Reason = 'missing_name' | 'outside_kingdom' | 'no_source' | 'unknown_city' | 'duplicate';
export interface Row { city_code?: unknown; name_ar?: unknown; name_en?: unknown; lat?: unknown; lng?: unknown; source?: unknown }
export interface CleanRow { city_code: string; name_ar: string; name_en: string; lat: number; lng: number; source: string }

export function validateExtract(input: { cities?: unknown[]; districts?: Row[] }, cityCodes: Set<string>): { kept: CleanRow[]; rejected: Record<Reason, number>; perCity: Record<string, { kept: number; rejected: number }> } {
  const rejected: Record<Reason, number> = { missing_name: 0, outside_kingdom: 0, no_source: 0, unknown_city: 0, duplicate: 0 };
  const perCity: Record<string, { kept: number; rejected: number }> = {};
  const kept: CleanRow[] = [];
  const seen = new Set<string>();
  const bump = (city: string, k: 'kept' | 'rejected') => { (perCity[city] ||= { kept: 0, rejected: 0 })[k] += 1; };
  for (const r of input.districts ?? []) {
    const city = typeof r.city_code === 'string' ? r.city_code : '';
    const reject = (why: Reason) => { rejected[why] += 1; bump(city || '(none)', 'rejected'); };
    if (!cityCodes.has(city)) { reject('unknown_city'); continue; }
    const ar = typeof r.name_ar === 'string' ? r.name_ar.trim() : '';
    const en = typeof r.name_en === 'string' ? r.name_en.trim() : '';
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
  return { kept, rejected, perCity };
}

export function summaryMarkdown(res: ReturnType<typeof validateExtract>, fetchReport: Record<string, unknown> = {}): string {
  const rows = Object.entries({ ...Object.fromEntries(Object.keys(fetchReport).map((c) => [c, { kept: 0, rejected: 0 }])), ...res.perCity }).sort(([a], [b]) => a.localeCompare(b));
  const lines = ['| city | kept | rejected | fetch |', '|---|---:|---:|---|'];
  for (const [city, c] of rows) lines.push(`| ${city} | ${c.kept} | ${c.rejected} | ${fetchReport[city] && (fetchReport[city] as { error?: unknown }).error ? `error ${(fetchReport[city] as { error: unknown }).error}` : 'ok'} |`);
  return [`**${res.kept.length} districts kept**; rejected: ${Object.entries(res.rejected).map(([k, v]) => `${k} ${v}`).join(', ')}`, '', ...lines].join('\n');
}

if (require.main === module) {
  const [inFile, outFile, summaryFile] = process.argv.slice(2);
  if (!inFile || !outFile) { console.error('usage: validate-districts-extract <in.json> <out.json> [summary.md]'); process.exit(2); }
  const cityCodes = new Set(SAUDI_LOCATIONS_SEED.filter((l) => l.type === 'city').map((l) => l.code));
  const res = validateExtract(JSON.parse(fs.readFileSync(inFile, 'utf8')), cityCodes);
  const reportFile = `${inFile}.report.json`;
  const fetchReport = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {};
  fs.writeFileSync(outFile, JSON.stringify({ cities: [], districts: res.kept }, null, 1));
  const md = summaryMarkdown(res, fetchReport);
  if (summaryFile) fs.writeFileSync(summaryFile, md);
  console.log(md);
  process.exit(res.kept.length ? 0 : 1);
}
