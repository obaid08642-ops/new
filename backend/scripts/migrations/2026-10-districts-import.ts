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

export { normalizeDistrictName, planImport } from '../../src/modules/location/districts-plan';
export type { ExistingRow, Extract, ExtractCity, ExtractDistrict, Plan, CityCounts } from '../../src/modules/location/districts-plan';
import { planImport, type ExistingRow, type Extract } from '../../src/modules/location/districts-plan';

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
