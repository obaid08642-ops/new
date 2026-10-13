// Migration: archive AI skin self-checks to archive_ai_skin_self_checks and clear live collection
// Usage: npx ts-node --transpile-only scripts/migrations/2026-10-archive-skin-checks.ts [--apply]
import { MongoClient } from 'mongodb';

const DRY_RUN = !process.argv.includes('--apply');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'nabd';

async function run() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);
  const coll = db.collection('ai_skin_self_checks');
  const archiveColl = db.collection('archive_ai_skin_self_checks');

  const count = await coll.countDocuments({});
  console.log(`[${DRY_RUN ? 'DRY-RUN' : 'APPLY'}] ai_skin_self_checks: ${count} documents to archive`);

  if (!DRY_RUN && count > 0) {
    const docs = await coll.find({}).toArray();
    if (docs.length > 0) {
      const docsWithArchive = docs.map(doc => ({
        ...doc,
        archived_at: new Date(),
      });
      await db.collection('archive_ai_skin_self_checks').insertMany(docsWithArchive);
      await coll.deleteMany({});
    }
    console.log(`  Archived ${count} documents to archive_ai_skin_self_checks`);
  }

  console.log('Done.');
  await client.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
