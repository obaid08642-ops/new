/**
 * Live-journey finding: providers registered through the provider-app wizard have provider_profiles
 * docs with `type` + `location`, but every operational reader (pharmacy broadcast, smart split,
 * matching, patient directory / SEO) queries `provider_type` + `geo`. Such providers never received
 * a request. New registrations and approvals now write both; this backfills existing docs.
 *
 *  - provider_type := type            where provider_type is missing
 *  - geo := { lat, lng } of location   where geo is missing and location has numeric lat/lng
 *
 * DEFAULT IS DRY-RUN: prints counts and changes nothing.
 * Apply with:  npx ts-node --transpile-only scripts/migrations/2026-09-sync-profile-type-geo.ts --apply
 * Requires MONGODB_URI; uses DB_NAME (default nabd_nestjs) like the app.
 */
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000, dbName: process.env.DB_NAME || 'nabd_nestjs' });
  const col = mongoose.connection.db!.collection('provider_profiles');
  const needType = { type: { $exists: true, $ne: null }, $or: [{ provider_type: { $exists: false } }, { provider_type: null }] };
  const needGeo = { 'location.lat': { $type: 'number' }, 'location.lng': { $type: 'number' }, $or: [{ geo: { $exists: false } }, { geo: null }] };
  const counts = { provider_type_missing: await col.countDocuments(needType), geo_missing_with_location: await col.countDocuments(needGeo) };
  const result: any = { dry_run: !APPLY, ...counts };
  if (APPLY) {
    result.provider_type_set = (await col.updateMany(needType, [{ $set: { provider_type: '$type' } }])).modifiedCount;
    result.geo_set = (await col.updateMany(needGeo, [{ $set: { geo: { lat: '$location.lat', lng: '$location.lng' } } }])).modifiedCount;
  }
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
