/**
 * P5.2: Consolidate chatsessions vs chat_sessions.
 * 
 * - chat_sessions: canonical collection (defined in chat-session.schema.ts with collection: 'chat_sessions')
 * - chatsessions: referenced only in PDPL service (pdpl.service.ts line 66), no schema/model
 * 
 * DEFAULT IS DRY-RUN. Apply: node scripts/migrations/2026-10-consolidate-chat-sessions.ts --apply
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

  for (const c of ['chat_sessions', 'chatsessions']) {
    if (!names.has(c)) {
      report[c] = { status: 'absent' };
      continue;
    }
    const count = await db.collection(c).countDocuments();
    const byState = await db.collection(c).aggregate([
      { $group: { _id: '$status', n: { $sum: 1 } } },
      { $project: { status: '$_id', n: 1, _id: 0 } }
    ]).toArray().catch(() => []);
    const byType = await db.collection(c).aggregate([
      { $group: { _id: '$type', n: { $sum: 1 } } },
      { $project: { type: '$_id', n: 1, _id: 0 } }
    ]).toArray().catch(() => []);
    const sample = await db.collection(c).findOne({}, { projection: { _id: 0 } });
    const fields = sample ? Object.keys(sample) : [];

    report[c] = {
      docs: count,
      by_status: byState,
      by_type: byType,
      field_count: fields.length,
      sample_fields: fields.slice(0, 30),
    };
  }

  // ID collision check
  if (report.chat_sessions?.docs && report.chatsessions?.docs) {
    const srcIds = Array.from((await db.collection('chatsessions').find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const dstIds = Array.from((await db.collection('chat_sessions').find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const srcSet = new Set(srcIds);
    const dstSet = new Set(dstIds);
    const collisions = srcIds.filter((id) => dstSet.has(id));
    report.id_collisions = collisions.length;
    report.collision_sample = collisions.slice(0, 5);
  }

  // Migration: chatsessions -> chat_sessions (canonical)
  if (!DRY && report.chatsessions?.docs > 0 && report.chat_sessions) {
    const existingIds = Array.from((await db.collection('chat_sessions').find({}, { projection: { id: 1 } }).toArray()).map((d: any) => d.id));
    const existingSet = new Set(existingIds);
    let migrated = 0;
    for (const doc of await db.collection('chatsessions').find({}).toArray()) {
      if (existingSet.has(doc.id)) continue;
      const { _id, ...rest } = doc as any;
      await db.collection('chat_sessions').insertOne(rest);
      migrated++;
    }
    report.migrated = migrated;
    if (migrated === report.chatsessions.docs) {
      await db.collection('chatsessions').drop();
      report.dropped = 'chatsessions';
    }
  }

  console.log(JSON.stringify(report, null, 2));
  await connection.close();
}

main().catch((e) => { console.error(e); process.exit(1); });