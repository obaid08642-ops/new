/**
 * Districts (أحياء) for every city: name_ar, name_en, city, a centroid point and the SOURCE of each row (owner item, 2026-10-25).
 * The seed has 2000 districts under 150 cities and NO coordinates on any row (cities included), so a map point cannot be matched
 * to a district. This fills them from an extract file; it never invents a name or a point.
 *
 * Input (`--file=<path>`, JSON): { "cities": [{ "code", "lat", "lng", "source" }], "districts": [{ "city_code", "name_ar", "name_en", "lat", "lng", "source", "source_url"? }] }.
 * Produce it with the official list first (Saudi National Address / SPL, or the data.gov.sa / GASTAT district datasets) and fill the
 * gaps from OpenStreetMap with `node tools/geo/fetch-osm-districts.mjs` (place=suburb|neighbourhood). `source` is kept on every row.
 *
 * - A district that already exists under the city (same name after normalisation, ar or en) only gets its centroid and source, and only
 *   while it has no coordinates: a stored point is never overwritten (an admin edit stays).
 * - A district not in the database is inserted under the next free code `<city>-NNN` (ar and en names only, no ur/hi/bn/tl).
 * - Dry-run default: prints counts per city (existing, extract, matched, new, rejected). `--apply` writes. Idempotent.
 * - NODE_ENV=production is refused unless CONFIRM_DISTRICTS_IMPORT=yes (the production run belongs to the catalogue-apply ops task).
 *
 * Run: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-districts-import.ts --file=districts.json [--apply]
 */
import * as fs from 'fs';
import { connect, connection } from 'mongoose';

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

async function main() {
  const file = (process.argv.find((a) => a.startsWith('--file=')) || '').slice(7);
  const apply = process.argv.includes('--apply');
  if (!file) throw new Error('--file=<extract.json> is required');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_DISTRICTS_IMPORT !== 'yes') throw new Error('refused: NODE_ENV=production needs CONFIRM_DISTRICTS_IMPORT=yes');
  const extract: Extract = JSON.parse(fs.readFileSync(file, 'utf8'));
  await connect(process.env.MONGODB_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const col = connection.db!.collection('locations');
  const existing = (await col.find({ type: { $in: ['city', 'district'] } }, { projection: { _id: 0, code: 1, name_ar: 1, name_en: 1, type: 1, parent_code: 1, coordinates: 1 } }).toArray()) as unknown as ExistingRow[];
  const plan = planImport(existing, extract);
  const totals = plan.perCity.reduce((t, c) => ({ existing: t.existing + c.existing, extract: t.extract + c.extract, matched: t.matched + c.matched, centroid_fills: t.centroid_fills + c.centroid_fills, new: t.new + c.new, rejected: t.rejected + c.rejected }), { existing: 0, extract: 0, matched: 0, centroid_fills: 0, new: 0, rejected: 0 });
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', totals, city_centroids_to_fill: plan.cityFills.length, rejected: plan.rejected.slice(0, 50), per_city: plan.perCity }));
  if (!apply) return;
  const now = new Date();
  for (const c of plan.cityFills) await col.updateOne({ code: c.code, type: 'city', 'coordinates.lat': { $exists: false } }, { $set: { coordinates: { lat: c.lat, lng: c.lng }, source: c.source, source_verified_at: now } });
  for (const f of plan.fills) await col.updateOne({ code: f.code, type: 'district', 'coordinates.lat': { $exists: false } }, { $set: { coordinates: { lat: f.lat, lng: f.lng }, source: f.source, source_verified_at: now } });
  for (const i of plan.inserts) {
    await col.updateOne({ code: i.code }, { $setOnInsert: { code: i.code, name_ar: i.name_ar, name_en: i.name_en, type: 'district', parent_code: i.city_code, aliases: [], coordinates: { lat: i.lat, lng: i.lng }, coverage: { pharmacy_delivery: true, home_healthcare: true, lab_collection: true }, is_active: true, source: i.source, source_verified_at: now, createdAt: now, updatedAt: now } }, { upsert: true });
  }
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
