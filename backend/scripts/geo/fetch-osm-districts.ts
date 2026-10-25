/**
 * Builds the extract that `scripts/migrations/2026-10-districts-import.ts` reads, from OpenStreetMap (place=suburb|neighbourhood|quarter),
 * for the cities of the `locations` collection. Use it to fill the gaps the OFFICIAL lists (Saudi National Address / SPL, data.gov.sa,
 * GASTAT) leave; the source of each row is recorded (`osm:<node|way|relation>/<id>`).
 *
 * Overpass etiquette: one query at a time, `--gap-ms` (default 12 s) between cities, an identifying User-Agent (`GEO_USER_AGENT`).
 * A place is kept only with BOTH an Arabic and an English name in OSM (`name:ar`, `name:en`): nothing is transliterated or guessed.
 * Needs network access to the Overpass API (not available in every sandbox).
 *
 * Run: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/geo/fetch-osm-districts.ts --out=districts.json [--cities=sa-riyadh,sa-jeddah]
 */
import * as fs from 'fs';
import { connect, connection } from 'mongoose';

export interface OsmElement { type: 'node' | 'way' | 'relation'; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }
export interface OutDistrict { city_code: string; name_ar: string; name_en: string; lat: number; lng: number; source: string }

/** The Overpass answer of one city → extract rows; places without both names or without a point are counted, not guessed. */
export function overpassToRows(cityCode: string, elements: OsmElement[]): { rows: OutDistrict[]; skipped: { no_ar_or_en_name: number; no_point: number; duplicate: number } } {
  const rows: OutDistrict[] = [];
  const skipped = { no_ar_or_en_name: 0, no_point: 0, duplicate: 0 };
  const seen = new Set<string>();
  for (const e of elements ?? []) {
    const ar = e.tags?.['name:ar']?.trim();
    const en = e.tags?.['name:en']?.trim();
    if (!ar || !en) { skipped.no_ar_or_en_name += 1; continue; }
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (typeof lat !== 'number' || typeof lng !== 'number') { skipped.no_point += 1; continue; }
    const key = `${ar}|${en}`.toLowerCase();
    if (seen.has(key)) { skipped.duplicate += 1; continue; }
    seen.add(key);
    rows.push({ city_code: cityCode, name_ar: ar, name_en: en, lat, lng, source: `osm:${e.type}/${e.id}` });
  }
  return { rows, skipped };
}

export function overpassQuery(cityNameAr: string, cityNameEn: string): string {
  const q = (s: string) => s.replace(/["\\]/g, '');
  return `[out:json][timeout:90];area["boundary"="administrative"]["name:ar"="${q(cityNameAr)}"]->.c;area["boundary"="administrative"]["name:en"="${q(cityNameEn)}"]->.d;(node(area.c)["place"~"^(suburb|neighbourhood|quarter)$"];way(area.c)["place"~"^(suburb|neighbourhood|quarter)$"];relation(area.c)["place"~"^(suburb|neighbourhood|quarter)$"];node(area.d)["place"~"^(suburb|neighbourhood|quarter)$"];way(area.d)["place"~"^(suburb|neighbourhood|quarter)$"];relation(area.d)["place"~"^(suburb|neighbourhood|quarter)$"];);out center tags;`;
}

async function main() {
  const out = (process.argv.find((a) => a.startsWith('--out=')) || '').slice(6);
  const only = (process.argv.find((a) => a.startsWith('--cities=')) || '').slice(9).split(',').filter(Boolean);
  const gap = Number((process.argv.find((a) => a.startsWith('--gap-ms=')) || '').slice(9)) || 12000;
  if (!out) throw new Error('--out=<file.json> is required');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await connect(process.env.MONGODB_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const cities = (await connection.db!.collection('locations').find({ type: 'city', is_active: true }, { projection: { _id: 0, code: 1, name_ar: 1, name_en: 1, coordinates: 1 } }).toArray()) as unknown as Array<{ code: string; name_ar: string; name_en: string; coordinates?: { lat: number; lng: number } }>;
  const ua = process.env.GEO_USER_AGENT || 'NabdPlus-backend/1.0 (+https://nabd.plus)';
  const endpoint = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
  const result: { cities: Array<{ code: string; lat: number; lng: number; source: string }>; districts: OutDistrict[] } = { cities: [], districts: [] };
  const report: Record<string, unknown> = {};
  for (const city of cities.filter((c) => !only.length || only.includes(c.code))) {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'User-Agent': ua, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(overpassQuery(city.name_ar.replace(/^(مدينة)\s+/, ''), city.name_en))}` });
    if (!res.ok) { report[city.code] = { error: res.status }; await new Promise((r) => setTimeout(r, gap)); continue; }
    const body: { elements?: OsmElement[] } = await res.json();
    const { rows, skipped } = overpassToRows(city.code, body.elements ?? []);
    result.districts.push(...rows);
    report[city.code] = { kept: rows.length, ...skipped };
    await new Promise((r) => setTimeout(r, gap));
  }
  fs.writeFileSync(out, JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ out, districts: result.districts.length, per_city: report }));
}

if (require.main === module) {
  main()
    .then(() => connection.close())
    .catch(async (e) => {
      console.error(e?.message || e);
      await connection.close().catch(() => undefined);
      process.exit(1);
    });
}
