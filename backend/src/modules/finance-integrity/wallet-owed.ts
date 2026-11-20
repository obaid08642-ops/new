/**
 * R11 wallet plan, step 3 (docs/platform/R11-wallet-balances-plan.md): "is any wallet balance money the platform owes a patient?" The owner decided on 2026-11-09 that the wallet stays removed, so a
 * balance above zero is owed money, not a number to migrate. This read-only function answers with COUNTS ONLY: how many wallets, how many hold a positive / negative balance, ONE total in SAR for the positive
 * ones, and how long ago the most recent wallet transaction of those wallets was (months). No id, no owner, no individual value is returned. It never writes.
 */
export interface WalletOwed {
  rows: number;
  zero_rows: number;
  positive_rows: number;
  negative_rows: number;
  not_a_number_rows: number;
  /** the sum of the positive balances in SAR, from whole halalas (one number, never a per-row figure) */
  positive_total_sar: number;
  /** wallets with a positive balance and no wallet transaction at all */
  positive_without_activity_rows: number;
  /** months since the newest wallet transaction among the positive wallets (null when there is none); the owner reads "how stale is the owed money" */
  positive_newest_activity_months_max: number | null;
  /** false when there were too many positive wallets to look up each one's activity (then only the counts above are given) */
  activity_checked: boolean;
}

const MONTH_MS = 30.44 * 86_400_000;
const MAX_ACTIVITY_LOOKUPS = 500;

export async function walletOwedCounts(db: any, now: number = Date.now()): Promise<WalletOwed> {
  const out: WalletOwed = { rows: 0, zero_rows: 0, positive_rows: 0, negative_rows: 0, not_a_number_rows: 0, positive_total_sar: 0, positive_without_activity_rows: 0, positive_newest_activity_months_max: null, activity_checked: true };
  let positiveHalalas = 0;
  const positiveWalletIds: string[] = [];
  const cursor = db.collection('wallets').find({}, { projection: { _id: 0, id: 1, balance: 1 }, maxTimeMS: 30_000 });
  for await (const w of cursor) {
    out.rows++;
    const b = w?.balance;
    if (typeof b !== 'number' || !Number.isFinite(b)) { out.not_a_number_rows++; continue; }
    if (b > 0) { out.positive_rows++; positiveHalalas += Math.round(b * 100); if (w.id) positiveWalletIds.push(String(w.id)); }
    else if (b < 0) out.negative_rows++;
    else out.zero_rows++;
  }
  out.positive_total_sar = positiveHalalas / 100;
  if (out.positive_rows > MAX_ACTIVITY_LOOKUPS) { out.activity_checked = false; return out; }
  for (const id of positiveWalletIds) {
    const last = await db.collection('wallet_transactions').find({ walletId: id }, { projection: { _id: 0, createdAt: 1 }, maxTimeMS: 30_000 }).sort({ createdAt: -1 }).limit(1).toArray();
    const at = last[0]?.createdAt ? new Date(last[0].createdAt).getTime() : NaN;
    if (!Number.isFinite(at)) { out.positive_without_activity_rows++; continue; }
    const months = Math.max(0, Math.floor((now - at) / MONTH_MS));
    out.positive_newest_activity_months_max = Math.max(out.positive_newest_activity_months_max ?? 0, months);
  }
  out.positive_without_activity_rows = Math.max(0, out.positive_rows - positiveWalletIds.length) + out.positive_without_activity_rows;
  return out;
}
