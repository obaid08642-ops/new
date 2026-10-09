/**
 * Q-12: fill `geoPoint` (GeoJSON) from `location: {lat, lng}` on provider profiles written before the
 * schema mirrored it, so "nearest" finds every existing clinic. Profiles without a valid location get
 * no geoPoint, and any half-written one ({type} without coordinates) is removed.
 *
 * - Dry-run default: prints the counts, changes nothing.
 * - `--apply`: writes them. Idempotent: a rerun finds nothing to do.
 *
 * Run: `MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-backfill-provider-geopoint.ts [--apply]`
 */
import { connect, connection } from 'mongoose';

const APPLY = process.argv.includes('--apply');
const COLLECTION = 'provider_profiles';

const validLocation = {
  'location.lat': { $type: 'number', $gte: -90, $lte: 90 },
  'location.lng': { $type: 'number', $gte: -180, $lte: 180 },
};

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nabdplus?replicaSet=rs0';
  await connect(uri, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const col = db.collection(COLLECTION);
  const broken = { geoPoint: { $exists: true }, 'geoPoint.coordinates.1': { $exists: false } };
  const toFill = { ...validLocation, $or: [{ geoPoint: { $exists: false } }, { 'geoPoint.coordinates.1': { $exists: false } }] };
  const counts = { mode: APPLY ? 'apply' : 'dry-run', to_fill: await col.countDocuments(toFill), broken: await col.countDocuments(broken) };
  console.log(JSON.stringify(counts));
  if (!APPLY) return;
  let filled = 0;
  for await (const doc of col.find(toFill, { projection: { location: 1 } })) {
    const { lat, lng } = (doc as any).location;
    await col.updateOne({ _id: doc._id }, { $set: { geoPoint: { type: 'Point', coordinates: [lng, lat] } } });
    filled += 1;
  }
  const cleared = (await col.updateMany(broken, { $unset: { geoPoint: '' } })).modifiedCount;
  console.log(JSON.stringify({ filled, cleared, remaining: await col.countDocuments(toFill) }));
}

main()
  .then(() => connection.close())
  .catch(async (e) => { console.error(e); await connection.close().catch(() => undefined); process.exit(1); });
