import { randomUUID } from 'crypto';

type Conn = { collection(name: string): any };

const round2 = (n: number) => Math.round(n * 100) / 100;
let indexReady: Promise<unknown> | null = null;

/** One unique key per ledger row: the same business event can never be recorded twice, even by two requests at once. */
function ensureIndex(conn: Conn) {
  indexReady ??= conn.collection('wallet_transactions').createIndex({ idempotency_key: 1 }, { unique: true, sparse: true, name: 'wallet_tx_idempotency_key' }).catch(() => null);
  return indexReady;
}

/** What the ledger says a wallet holds: credits minus debits. The balance is never adjusted by hand; this is the only figure. */
export async function walletLedgerBalance(conn: Conn, walletId: string): Promise<number> {
  const rows: Array<{ _id: string; total: number }> = await conn.collection('wallet_transactions').aggregate([
    { $match: { walletId } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]).toArray();
  const sum = (t: string) => rows.find((r) => r._id === t)?.total ?? 0;
  return round2(sum('credit') - sum('debit'));
}

/**
 * Credits (or debits) a wallet through its ledger, once per business event.
 * 1. The ledger row is written with an idempotency key (`<referenceType>:<referenceId>`, unique); a repeat finds the row and changes nothing.
 * 2. `wallets.balance` is then set to the ledger's sum (a projection of the ledger), never incremented by this code.
 * Returns `credited: false` when the wallet does not exist or the event was already recorded.
 */
export async function postWalletEntry(
  conn: Conn,
  entry: { ownerId: string; ownerType: string; amount: number; type: 'credit' | 'debit'; referenceType: string; referenceId: string; description: string },
): Promise<{ credited: boolean; balance: number | null }> {
  const amount = round2(entry.amount);
  if (!(amount > 0)) return { credited: false, balance: null };
  const wallet: any = await conn.collection('wallets').findOne({ ownerId: entry.ownerId, ownerType: entry.ownerType });
  if (!wallet) return { credited: false, balance: null };
  await ensureIndex(conn);
  // a row written before the idempotency key existed (same reference) counts as already recorded
  const legacy = await conn.collection('wallet_transactions').findOne({ walletId: wallet.id, referenceType: entry.referenceType, referenceId: entry.referenceId });
  if (legacy) return { credited: false, balance: await walletLedgerBalance(conn, wallet.id) };
  const key = `${entry.referenceType}:${entry.referenceId}`;
  const now = new Date();
  const res: any = await conn.collection('wallet_transactions').updateOne(
    { idempotency_key: key },
    { $setOnInsert: { id: randomUUID(), walletId: wallet.id, amount, type: entry.type, referenceType: entry.referenceType, referenceId: entry.referenceId, description: entry.description, idempotency_key: key, createdAt: now, updatedAt: now } },
    { upsert: true },
  );
  const created = (res?.upsertedCount ?? 0) > 0 || !!res?.upsertedId;
  const balance = await walletLedgerBalance(conn, wallet.id);
  if (created) await conn.collection('wallets').updateOne({ _id: wallet._id }, { $set: { balance, updatedAt: now } });
  return { credited: created, balance };
}
