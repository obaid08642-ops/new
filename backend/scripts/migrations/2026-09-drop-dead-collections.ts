/*
 * P5.2: drop provably-dead duplicate collections (zero code refs, zero docs).
 * - labcenterbookings (code uses labbookings; 0 refs)
 * - radiologycenterbookings (code uses radiologybookings; 0 refs)
 * - providerdeltas (code uses provider_deltas; 0 refs)
 * - labcatalogs (empty; code uses labservices; 0 refs)
 * Drops ONLY when empty; otherwise prints counts and aborts (staging data
 * needs the copy migration, not a drop).
 *
 * DEFAULT IS DRY-RUN. Apply: node scripts/migrations/2026-09-drop-dead-collections.ts --apply
 * Requires MONGODB_URI.
 */
const mongoose = require('mongoose');

const DRY = !process.argv.includes('--apply');
const DEAD = ['labcenterbookings', 'radiologycenterbookings', 'providerdeltas', 'labcatalogs'];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  const names = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const report = [];
  for (const c of DEAD) {
    if (!names.has(c)) { report.push({ collection: c, status: 'absent' }); continue; }
    const n = await db.collection(c).countDocuments();
    if (n > 0) { report.push({ collection: c, status: 'NOT-EMPTY-ABORT', docs: n }); continue; }
    if (!DRY) await db.collection(c).drop();
    report.push({ collection: c, status: DRY ? 'would-drop(empty)' : 'dropped' });
  }
  console.log(JSON.stringify({ dry_run: DRY, report }, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
