/**
 * P5.2: Consolidate labcenterbookings -> labbookings (DRY-RUN ONLY).
 * 
 * labcenterbookings: legacy collection with center-scoped fields
 * labbookings: canonical collection (defined in lab.schema.ts)
 * 
 * DEFAULT IS DRY-RUN. Apply: node scripts/migrations/2026-10-consolidate-lab-bookings.ts --apply
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

  for (const c of ['labcenterbookings', 'labbookings']) {
    if (!names.has(c)) {
      report[c] = { status: 'absent' };
      continue;
    }
    const count = await db.collection(c).countDocuments();
    const byState = await db.collection(c).aggregate([
      { $group: { _id: '$status', n: { $sum: 1 } } },
      { $project: { status: '$_id', n: 1, _id: 0 } }
    ]).toArray().catch(() => []);
    const sample = await db.collection(c).findOne({}, { projection: { _id: 0 } });
    const fields = sample ? Object.keys(sample) : [];

    report[c] = {
      docs: count,
      by_state: byState,
      field_count: fields.length,
      sample_fields: fields.slice(0, 30),
    };
  }

  if (report.labcenterbookings?.docs && report.labbookings?.docs) {
    const srcIds = Array.from((await db.collection('labcenterbookings').find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const dstIds = Array.from((await db.collection('labbookings').find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const srcSet = new Set(srcIds);
    const dstSet = new Set(dstIds);
    const collisions = srcIds.filter((id) => dstSet.has(id));
    report.id_collisions = collisions.length;
    report.collision_sample = collisions.slice(0, 5);
  }

  if (!DRY && report.labcenterbookings?.docs > 0 && report.labbookings) {
    const existingIds = Array.from((await db.collection('labbookings').find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const existingSet = new Set(existingIds);
    let migrated = 0;
    for (const doc of await db.collection('labcenterbookings').find({}).toArray()) {
      if (existingSet.has(doc.id)) continue;
      const { _id, ...rest } = doc as any;
      await db.collection('labbookings').insertOne(rest);
      migrated++;
    }
    report.migrated = migrated;
    if (migrated === report.labcenterbookings.docs) {
      await db.collection('labcenterbookings').drop();
      report.dropped = 'labcenterbookings';
    }
  }

  console.log(JSON.stringify(report, null, 2));
  await connection.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
