/**
 * P5.2: Consolidate notifications -> notifications (DRY-RUN ONLY).
 * 
 * Multiple notification collections unified into one.
 * 
 * DEFAULT IS DRY-RUN. Apply: node scripts/migrations/2026-10-consolidate-notifications.ts --apply
 * Requires MONGODB_URI.
 */
import { connect, connection } from 'mongoose';

const DRY = !process.argv.includes('--apply');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nabdplus?replicaSet=rs0';
  await connect(uri);
  const db = connection.db;
  if (!db) throw new Error('no database connection');

  const names = new Set((await db.listCollections().toArray()).map((c: any) => c.name));
  const report: any = { dry_run: DRY, writes_performed: false };

  const collections = ['notifications', 'provider_notifications', 'admin_notifications', 'user_notifications'];
  
  for (const c of collections) {
    if (!names.has(c)) {
      report[c] = { status: 'absent' };
      continue;
    }
    const count = await db.collection(c).countDocuments();
    const byType = await db.collection(c).aggregate([
      { $group: { _id: '$type', n: { $sum: 1 } } },
      { $project: { type: '$_id', n: 1, _id: 0 } }
    ]).toArray().catch(() => []);
    const sample = await db.collection(c).findOne({}, { projection: { _id: 0 } });
    const fields = sample ? Object.keys(sample) : [];

    report[c] = {
      docs: count,
      by_type: byType,
      field_count: fields.length,
      sample_fields: fields.slice(0, 30),
    };
  }

  // Migration: all -> notifications (canonical)
  if (!DRY) {
    const canonical = 'notifications';
    const existingIds = Array.from((await db.collection(canonical).find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const existingSet = new Set(existingIds);
    let totalMigrated = 0;

    for (const c of collections.filter(c => c !== canonical)) {
      if (!names.has(c)) continue;
      let migrated = 0;
      for (const doc of await db.collection(c).find({}).toArray()) {
        if (existingSet.has(doc.id)) continue;
        const { _id, ...rest } = doc as any;
        await db.collection(canonical).insertOne(rest);
        migrated++;
      }
      if (migrated > 0) {
        report.migrated = (report.migrated || 0) + migrated;
        await db.collection(c).drop();
        report.dropped = (report.dropped || '') + c + ';';
      }
    }
  }

  console.log(JSON.stringify(report, null, 2));
  await connection.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
