/*
 * P5.2: merge orphaned `auditlogs` collection into canonical `audit_logs`.
 * auditlogs has NO code readers/writers (verified by grep); its 28 docs are
 * preserved with an _migrated_from tag, then the empty-source is dropped.
 * admin_audit_log + provider_audit_logs stay (live readers, distinct shapes;
 * the P6 unified viewer reads across all three).
 *
 * DEFAULT IS DRY-RUN. Apply: node scripts/migrations/2026-09-merge-auditlogs.ts --apply
 * Requires MONGODB_URI.
 */
const mongoose = require('mongoose');

const DRY = !process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  const names = new Set((await db.listCollections().toArray()).map((c) => c.name));
  if (!names.has('auditlogs')) {
    console.log(JSON.stringify({ dry_run: DRY, status: 'auditlogs absent — nothing to do' }));
    await mongoose.disconnect();
    return;
  }
  const docs = await db.collection('auditlogs').find({}).toArray();
  console.log(JSON.stringify({ dry_run: DRY, auditlogs_docs: docs.length }));
  if (!DRY && docs.length) {
    const batch = docs.map((d) => ({ ...d, _migrated_from: 'auditlogs', migrated_at: new Date() }));
    await db.collection('audit_logs').insertMany(batch);
    await db.collection('auditlogs').drop();
    console.log(JSON.stringify({ copied: docs.length, dropped: 'auditlogs' }));
  }
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
