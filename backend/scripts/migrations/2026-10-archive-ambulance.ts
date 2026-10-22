/**
 * D-14 (owner decision 14, answer O-2): the ambulance system is removed. Its data is archived first, never
 * dropped silently.
 *
 * - Dry-run default: prints the counts, changes nothing.
 * - `--apply`: copies every document of emergency_requests, ambulance_vehicles and drivershifts, and the
 *   ambulance rows of provider_accounts and provider_profiles, into archive_<collection> (same _id, plus
 *   `archived_at`), then deletes only the documents that are safely in the archive. Other provider types
 *   are untouched.
 * - `users` with the retired role `ambulance` are not archived or deleted (their payouts, audit and PDPL
 *   history point at them): `--apply` sets `active: false` and bumps `token_version`, so they can no longer
 *   sign in and any open session ends. The role stays a valid value in the users schema (RETIRED_USER_ROLES).
 * - Idempotent: a rerun archives nothing twice (upsert by _id).
 *
 * Run: `MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-archive-ambulance.ts [--apply]`
 */
import { connect, connection } from 'mongoose';

const APPLY = process.argv.includes('--apply');
const AMBULANCE = { $or: [{ provider_type: { $in: ['ambulance', 'ems'] } }, { type: { $in: ['ambulance', 'ems'] } }] };
const TARGETS: Array<{ name: string; filter: Record<string, unknown> }> = [
  { name: 'emergency_requests', filter: {} },
  { name: 'ambulance_vehicles', filter: {} },
  { name: 'drivershifts', filter: {} },
  { name: 'provider_accounts', filter: AMBULANCE },
  { name: 'provider_profiles', filter: AMBULANCE },
];

async function main() {
  // Phase 16 / review item C: an explicit MONGODB_URI is required. A default host
  // would let a mistyped run hit a local database that is not the one it names.
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  const uri = process.env.MONGODB_URI;
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
  const users = db.collection('users');
  const RETIRED = { role: 'ambulance' };
  const userEntry: any = { collection: 'users', role: 'ambulance', active: await users.countDocuments({ ...RETIRED, active: { $ne: false } }) };
  if (APPLY && userEntry.active > 0) {
    const res = await users.updateMany({ ...RETIRED, active: { $ne: false } }, { $set: { active: false }, $inc: { token_version: 1 } });
    userEntry.deactivated = res.modifiedCount;
  }
  userEntry.left_active = await users.countDocuments({ ...RETIRED, active: { $ne: false } });
  report.push(userEntry);
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', report }));
}

main()
  .then(() => connection.close())
  .catch(async (e) => { console.error(e); await connection.close().catch(() => undefined); process.exit(1); });
