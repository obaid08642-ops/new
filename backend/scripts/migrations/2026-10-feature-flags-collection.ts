// Feature flags were written to `featureflags` (Mongoose's default name) while /config and the
// kill switches read `feature_flags`. The schema now names `feature_flags`; this copies any flag
// that exists only in the old collection. A key already in `feature_flags` is never overwritten.
// Usage: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-feature-flags-collection.ts [--apply]
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');

async function run() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = mongoose.connection.db!;
  const old = await db.collection('featureflags').find({}).toArray();
  let copied = 0;
  for (const row of old) {
    if (!row.key) continue;
    if (await db.collection('feature_flags').countDocuments({ key: row.key }, { limit: 1 })) continue;
    if (APPLY) await db.collection('feature_flags').insertOne({ key: row.key, enabled: !!row.enabled });
    copied += 1;
  }
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', old_rows: old.length, to_copy: copied }));
}

run()
  .then(() => mongoose.disconnect())
  .catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => null); process.exit(1); });
