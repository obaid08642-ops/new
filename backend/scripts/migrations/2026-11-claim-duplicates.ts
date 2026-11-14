/**
 * Before the partial unique index `claim_one_open_per_booking` (schemas/insurance.schema.ts) can build, a booking must have at most one OPEN claim
 * (pending, facility-approved or reimbursed). Two submits in the same instant, or a claim filed while the first was facility-approved, could leave two.
 *
 * DEFAULT IS DRY-RUN: lists every booking with more than one open claim and what --apply would do.
 *   --apply keeps the most advanced claim per booking (reimbursed > approved > pending, then the oldest) and rejects the other PENDING or APPROVED ones
 *   (no money moved on them). A booking with TWO reimbursed claims is never touched: it is listed as MANUAL (money was paid twice; finance decides).
 * Run:  npx ts-node --transpile-only scripts/migrations/2026-11-claim-duplicates.ts [--apply]
 * Requires MONGODB_URI; uses DB_NAME (default nabd_nestjs) like the app. Test database first.
 */
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');
const OPEN = ['pending', 'approved', 'reimbursed'];
const RANK: Record<string, number> = { reimbursed: 3, approved: 2, pending: 1 };

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000, dbName: process.env.DB_NAME || 'nabd_nestjs' });
  const col = mongoose.connection.db!.collection('insurance_claims');
  const groups = await col.aggregate([
    { $match: { status: { $in: OPEN }, booking_id: { $type: 'string' } } },
    { $group: { _id: { k: '$booking_kind', b: '$booking_id' }, n: { $sum: 1 }, claims: { $push: { id: '$id', status: '$status', amount: '$amount', createdAt: '$createdAt' } } } },
    { $match: { n: { $gt: 1 } } },
  ]).toArray();
  let toReject = 0; let manual = 0;
  for (const g of groups as any[]) {
    const sorted = [...g.claims].sort((a, b) => (RANK[b.status] - RANK[a.status]) || (+new Date(a.createdAt) - +new Date(b.createdAt)));
    const keep = sorted[0];
    const extra = sorted.slice(1);
    if (extra.some((c) => c.status === 'reimbursed')) {
      manual++;
      console.log(`MANUAL ${g._id.k}/${g._id.b}: more than one reimbursed claim (${g.claims.filter((c: any) => c.status === 'reimbursed').map((c: any) => c.id).join(', ')})`);
      continue;
    }
    toReject += extra.length;
    console.log(`${APPLY ? 'REJECT' : 'would reject'} ${extra.map((c) => `${c.id} (${c.status})`).join(', ')} for ${g._id.k}/${g._id.b}; keep ${keep.id} (${keep.status})`);
    if (APPLY) {
      await col.updateMany({ id: { $in: extra.map((c) => c.id) }, status: { $in: ['pending', 'approved'] } }, { $set: { status: 'rejected', decision_note: `duplicate of ${keep.id} (claim_one_open_per_booking migration)`, decided_at: new Date(), updatedAt: new Date() } });
    }
  }
  console.log(`${groups.length} booking(s) with more than one open claim; ${toReject} claim(s) ${APPLY ? 'rejected' : 'to reject (dry run, nothing changed)'}; ${manual} need manual review.`);
  await mongoose.disconnect();
  if (manual) process.exitCode = 2;
}
main().catch((e) => { console.error(e); process.exit(1); });
