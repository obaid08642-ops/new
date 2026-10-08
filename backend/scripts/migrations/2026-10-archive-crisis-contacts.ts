/**
 * D-8 (owner decision 8): in-app crisis handling is removed. The stored personal crisis contacts
 * are archived before the live collection is emptied, so nothing is lost.
 *
 * - Dry-run default: prints the counts, changes nothing.
 * - `--apply`: copies every `crisis_contacts` document to `archive_crisis_contacts` (same _id,
 *   plus `archived_at`), then deletes only the documents that are safely in the archive.
 * - Idempotent: a rerun archives nothing twice (upsert by _id) and finds the live collection empty.
 *
 * Run: `MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-archive-crisis-contacts.ts [--apply]`
 */
import { connect, connection } from 'mongoose';

const APPLY = process.argv.includes('--apply');
const FROM = 'crisis_contacts';
const TO = 'archive_crisis_contacts';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nabdplus?replicaSet=rs0';
  await connect(uri, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const live = await db.collection(FROM).countDocuments();
  const archivedBefore = await db.collection(TO).countDocuments();
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', live, archived: archivedBefore }));
  if (!APPLY || live === 0) return;
  const archivedAt = new Date();
  let moved = 0;
  for await (const doc of db.collection(FROM).find({})) {
    await db.collection(TO).updateOne({ _id: doc._id }, { $setOnInsert: { ...doc, archived_at: archivedAt } }, { upsert: true });
    const inArchive = await db.collection(TO).countDocuments({ _id: doc._id }, { limit: 1 });
    if (inArchive === 1) {
      await db.collection(FROM).deleteOne({ _id: doc._id });
      moved += 1;
    }
  }
  console.log(JSON.stringify({ moved, live: await db.collection(FROM).countDocuments(), archived: await db.collection(TO).countDocuments() }));
}

main()
  .then(() => connection.close())
  .catch(async (e) => { console.error(e); await connection.close().catch(() => undefined); process.exit(1); });
