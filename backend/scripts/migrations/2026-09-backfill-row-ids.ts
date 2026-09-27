/**
 * Live-journey finding: admin approval of provider changes wrote rows with a raw insert/upsert that skipped
 * the mongoose `id` default. The first such row got `id: null`/no id; every later insert then collided on the
 * unique `id` index (409), and rows without an id cannot be referenced (offers, allocations, bookings).
 * The approval path now sets the id; this gives every existing id-less row one.
 *
 * DEFAULT IS DRY-RUN: prints counts per collection and changes nothing.
 * Apply with:  npx ts-node --transpile-only scripts/migrations/2026-09-backfill-row-ids.ts --apply
 * Requires MONGODB_URI; uses DB_NAME (default nabd_nestjs) like the app.
 */
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const APPLY = process.argv.includes('--apply');
const COLLECTIONS = [
  'provider_schedule_slots',
  'provider_capabilities_pharmacy',
  'provider_capabilities_lab',
  'provider_capabilities_radiology',
  'provider_capabilities_doctor_sessions',
  'provider_capabilities_home_care',
  'provider_delivery_zones',
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000, dbName: process.env.DB_NAME || 'nabd_nestjs' });
  const db = mongoose.connection.db!;
  const missing = { $or: [{ id: { $exists: false } }, { id: null }, { id: '' }] };
  const result: Record<string, any> = { dry_run: !APPLY };
  for (const name of COLLECTIONS) {
    const col = db.collection(name);
    const rows = await col.find(missing, { projection: { _id: 1 } }).toArray();
    result[name] = { without_id: rows.length };
    if (APPLY) {
      let fixed = 0;
      for (const r of rows) fixed += (await col.updateOne({ _id: r._id }, { $set: { id: randomUUID() } })).modifiedCount;
      result[name].fixed = fixed;
    }
  }
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
