/**
 * D-1 (owner decision 1): community user posts are removed. Their data is archived first,
 * never dropped silently.
 *
 * - Dry-run default: prints the counts, changes nothing.
 * - `--apply`: copies every document of community_posts, community_comments and
 *   community_live_sessions into archive_<collection> (same _id, plus `archived_at`), then
 *   deletes only the documents that are safely in the archive.
 * - Idempotent: a rerun archives nothing twice (upsert by _id).
 *
 * Run: `MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-archive-community.ts [--apply]`
 */
import { connect, connection } from 'mongoose';

const APPLY = process.argv.includes('--apply');
const TARGETS: Array<{ name: string; filter: Record<string, unknown> }> = [
  { name: 'community_posts', filter: {} },
  { name: 'community_comments', filter: {} },
  { name: 'community_live_sessions', filter: {} },
];

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nabdplus?replicaSet=rs0';
  await connect(uri, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const report: any[] = [];
  for (const { name, filter } of TARGETS) {
    const live = db.collection(name);
    const archive = db.collection(`archive_${name}`);
    const entry: any = { collection: name, to_archive: await live.countDocuments(filter), moved: 0 };
    if (APPLY && entry.to_archive > 0) {
      const archivedAt = new Date();
      for await (const doc of live.find(filter)) {
        await archive.updateOne({ _id: doc._id }, { $setOnInsert: { ...doc, archived_at: archivedAt } }, { upsert: true });
        if ((await archive.countDocuments({ _id: doc._id }, { limit: 1 })) === 1) {
          await live.deleteOne({ _id: doc._id });
          entry.moved += 1;
        }
      }
    }
    entry.left = await live.countDocuments(filter);
    entry.archived = await archive.countDocuments({});
    report.push(entry);
  }
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', report }));
}

main()
  .then(() => connection.close())
  .catch(async (e) => { console.error(e); await connection.close().catch(() => undefined); process.exit(1); });
