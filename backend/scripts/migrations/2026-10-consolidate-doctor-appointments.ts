/**
 * P5.2: Consolidate doctor_appointments -> appointments (DRY-RUN ONLY).
 * 
 * doctor_appointments: legacy collection with legacy fields
 * appointments: canonical collection (defined in appointment.schema.ts)
 * 
 * DEFAULT IS DRY-RUN. Apply: node scripts/migrations/2026-10-consolidate-doctor-appointments.ts --apply
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

  for (const c of ['doctor_appointments', 'appointments']) {
    if (!names.has(c)) {
      report[c] = { status: 'absent' };
      continue;
    }
    const count = await db.collection(c).countDocuments();
    const byState = await db.collection(c).aggregate([
      { $group: { _id: '$state', n: { $sum: 1 } } },
      { $project: { state: '$_id', n: 1, _id: 0 } }
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

  // ID collision check
  if (report.doctor_appointments?.docs && report.appointments?.docs) {
    const srcIds = Array.from((await db.collection('doctor_appointments').find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const dstIds = Array.from((await db.collection('appointments').find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const srcSet = new Set(srcIds);
    const dstSet = new Set(dstIds);
    const collisions = srcIds.filter((id) => dstSet.has(id));
    report.id_collisions = collisions.length;
    report.collision_sample = collisions.slice(0, 5);
  }

  // Migration: doctor_appointments -> appointments (canonical)
  if (!DRY && report.doctor_appointments?.docs > 0 && report.appointments) {
    const existingIds = Array.from((await db.collection('appointments').find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const existingSet = new Set(existingIds);
    let migrated = 0;
    for (const doc of await db.collection('doctor_appointments').find({}).toArray()) {
      if (existingSet.has(doc.id)) continue;
      const { _id, ...rest } = doc as any;
      await db.collection('appointments').insertOne(rest);
      migrated++;
    }
    report.migrated = migrated;
    if (migrated === report.doctor_appointments.docs) {
      await db.collection('doctor_appointments').drop();
      report.dropped = 'doctor_appointments';
    }
  }

  console.log(JSON.stringify(report, null, 2));
  await connection.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
