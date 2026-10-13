// Migration: archive community data to archive_<collection> and clear original collections
// Usage: npx ts-node --transpile-only scripts/migrations/2026-10-archive-community.ts [--apply]
import { MongoClient } from 'mongodb';

const DRY_RUN = !process.argv.includes('--apply');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'nabd';

async function run() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);

  const collections = ['community_posts', 'community_comments', 'community_live_sessions'];

  for (const collName of collections) {
    const coll = db.collection(collName);
    const archiveColl = db.collection(`archive_${collName}`);

    const count = await coll.countDocuments({});
    console.log(`[${DRY_RUN ? 'DRY-RUN' : 'APPLY'}] ${collName}: ${count} documents to archive`);

    if (!DRY_RUN && count > 0) {
      const docs = await coll.find({}).toArray();
      if (docs.length > 0) {
        // Add archived_at timestamp
        const docsWithArchive = docs.map(doc => ({
          ...doc,
          archived_at: new Date(),
        }));
        await archiveColl.insertMany(docsWithArchive);
        await coll.deleteMany({});
      }
    }
    console.log(`  Archived ${count} documents to archive_${collName}`);
  }

  console.log('Done.');
  await client.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
