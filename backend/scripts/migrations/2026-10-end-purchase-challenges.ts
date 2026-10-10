/**
 * D-9 (owner decision 9): loyalty challenges are health habits only. Existing purchase-tied
 * challenges are ended and archived, never dropped silently.
 *
 * - Dry-run default: prints the counts, changes nothing.
 * - `--apply`: copies every purchase challenge of loyalty_challenges into
 *   archive_loyalty_challenges (same _id, plus `archived_at`), then sets it inactive with
 *   end_date <= now. Health-habit challenges are untouched.
 * - Idempotent: a rerun archives nothing twice (upsert by _id) and re-ends nothing.
 *
 * A challenge is purchase-tied when its target_action is order_delivered, order_medicine, or
 * otherwise about buying medicines (purchase/checkout/cart/buy/order_*).
 *
 * Run: `MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-end-purchase-challenges.ts [--apply]`
 */
import { connect, connection } from 'mongoose';

const APPLY = process.argv.includes('--apply');
const EXACT = new Set(['order_delivered', 'order_medicine']);

function isPurchase(action: unknown): boolean {
  if (typeof action !== 'string' || !action.trim()) return false;
  const a = action.trim();
  return EXACT.has(a) || /(purchas|checkout|\bbuy\b|cart)/i.test(a) || /(^order[_-])|([_-]order([_-]|$))/i.test(a);
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nabdplus?replicaSet=rs0';
  await connect(uri, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = connection.db;
  if (!db) throw new Error('no database connection');
  const live = db.collection('loyalty_challenges');
  const archive = db.collection('archive_loyalty_challenges');
  const docs = await live.find({}).toArray();
  const purchase = docs.filter((d: any) => isPurchase(d?.target_action));
  const entry: any = { collection: 'loyalty_challenges', purchase_found: purchase.length, moved: 0 };
  if (APPLY && purchase.length > 0) {
    const archivedAt = new Date();
    const now = new Date();
    for (const doc of purchase) {
      await archive.updateOne({ _id: (doc as any)._id }, { $setOnInsert: { ...doc, archived_at: archivedAt } }, { upsert: true });
      if ((await archive.countDocuments({ _id: (doc as any)._id }, { limit: 1 })) === 1) {
        await live.updateOne(
          { _id: (doc as any)._id },
          { $set: { active: false, end_date: (doc as any).end_date && new Date((doc as any).end_date) < now ? (doc as any).end_date : now } },
        );
        entry.moved += 1;
      }
    }
  }
  entry.purchase_active_left = await live.countDocuments({ active: true });
  entry.archived = await archive.countDocuments({});
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', report: [entry] }));
}

main()
  .then(() => connection.close())
  .catch(async (e) => { console.error(e); await connection.close().catch(() => undefined); process.exit(1); });
