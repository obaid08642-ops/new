import { randomUUID } from 'crypto';
import { moneyShadows } from './halala-shadow';
import { roundToCurrency } from './money-minor';
import { resolveWriteCurrency } from './minor-shadow';
import { DEFAULT_CURRENCY } from './market-defaults';

type Conn = { collection(name: string): any };

const roundIn = roundToCurrency;
/** A wallet row with no currency was written before currencies existed: it is in the Saudi currency. */
const walletCurrency = (wallet: any): string => (typeof wallet?.currency === 'string' && wallet.currency ? wallet.currency : DEFAULT_CURRENCY);
/** The unique index behind the idempotency key. Sparse: rows written before the key existed carry none and must not collide with each other. */
export const WALLET_TX_INDEX = { keys: { idempotency_key: 1 }, options: { unique: true, sparse: true, name: 'wallet_tx_idempotency_key' } } as const;
let indexReady: Promise<unknown> | null = null;

/** One unique key per ledger row: the same business event can never be recorded twice, even by two requests at once. */
function ensureIndex(conn: Conn) {
  indexReady ??= conn.collection('wallet_transactions').createIndex({ ...WALLET_TX_INDEX.keys }, { ...WALLET_TX_INDEX.options }).catch(() => null);
  return indexReady;
}

/** What the ledger says a wallet holds: credits minus debits. The balance is never adjusted by hand; this is the only figure. */
export async function walletLedgerBalance(conn: Conn, walletId: string, currency?: string): Promise<number> {
  const cur = currency ?? walletCurrency(await conn.collection('wallets').findOne({ id: walletId }, { projection: { _id: 0, currency: 1 } }));
  const rows: Array<{ _id: string; total: number }> = await conn.collection('wallet_transactions').aggregate([
    { $match: { walletId } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]).toArray();
  const sum = (t: string) => rows.find((r) => r._id === t)?.total ?? 0;
  return roundIn(sum('credit') - sum('debit'), cur);
}

/**
 * Credits (or debits) a wallet through its ledger, once per business event.
 * 1. The ledger row is written with an idempotency key (`<walletId>:<type>:<referenceType>:<referenceId>`, unique and sparse: rows written before the key existed have none); an exact repeat finds the row and changes nothing.
 * 2. `wallets.balance` is then set to the ledger's sum (a projection of the ledger), never incremented by this code.
 * Returns `credited: false` when the wallet does not exist or the event was already recorded.
 */
export async function postWalletEntry(
  conn: Conn,
  entry: { ownerId: string; ownerType: string; amount: number; type: 'credit' | 'debit'; referenceType: string; referenceId: string; description: string },
  opts: { createWalletIfMissing?: boolean } = {},
): Promise<{ credited: boolean; balance: number | null }> {
  let wallet: any = await conn.collection('wallets').findOne({ ownerId: entry.ownerId, ownerType: entry.ownerType });
  // an entry that rounds to nothing in the wallet's currency (a new wallet takes the market's) neither creates a wallet nor writes a row
  if (!(roundIn(entry.amount, wallet ? walletCurrency(wallet) : resolveWriteCurrency()) > 0)) return { credited: false, balance: null };
  if (!wallet && opts.createWalletIfMissing) {
    // one wallet per owner (unique index on ownerId + ownerType): a concurrent creator wins, we read its row
    const now0 = new Date();
    const newCurrency = resolveWriteCurrency();
    await conn.collection('wallets').updateOne({ ownerId: entry.ownerId, ownerType: entry.ownerType }, { $setOnInsert: { id: randomUUID(), ownerId: entry.ownerId, ownerType: entry.ownerType, balance: 0, currency: newCurrency, ...moneyShadows({ balance: 0 }, ['balance'], newCurrency), savedCards: [], createdAt: now0, updatedAt: now0 } }, { upsert: true });
    wallet = await conn.collection('wallets').findOne({ ownerId: entry.ownerId, ownerType: entry.ownerType });
  }
  if (!wallet) return { credited: false, balance: null };
  const cur = walletCurrency(wallet);
  const amount = roundIn(entry.amount, cur);
  await ensureIndex(conn);
  // a row written before the idempotency key existed (same wallet, direction and reference) counts as already recorded
  const legacy = await conn.collection('wallet_transactions').findOne({ walletId: wallet.id, type: entry.type, referenceType: entry.referenceType, referenceId: entry.referenceId });
  if (legacy) return { credited: false, balance: await walletLedgerBalance(conn, wallet.id, cur) };
  // one key per wallet, direction and business event: the same reference on another wallet, or the opposite direction on this one
  // (a debit and its reversal, a patient credit and a provider debit on one order), is a different entry and is recorded
  const key = `${wallet.id}:${entry.type}:${entry.referenceType}:${entry.referenceId}`;
  const now = new Date();
  const res: any = await conn.collection('wallet_transactions').updateOne(
    { idempotency_key: key },
    { $setOnInsert: { id: randomUUID(), walletId: wallet.id, amount, ...moneyShadows({ amount }, ['amount'], cur), type: entry.type, referenceType: entry.referenceType, referenceId: entry.referenceId, description: entry.description, idempotency_key: key, createdAt: now, updatedAt: now } },
    { upsert: true },
  );
  const created = (res?.upsertedCount ?? 0) > 0 || !!res?.upsertedId;
  let balance = await walletLedgerBalance(conn, wallet.id, cur);
  if (created && entry.type === 'debit' && balance < 0) {
    // a debit never leaves the wallet below zero, even when two debits race: the row that overdraws is taken back
    await conn.collection('wallet_transactions').deleteOne({ idempotency_key: key });
    balance = await walletLedgerBalance(conn, wallet.id, cur);
    throw new WalletInsufficientError(balance);
  }
  if (created) await conn.collection('wallets').updateOne({ _id: wallet._id }, { $set: { balance, ...moneyShadows({ balance }, ['balance'], cur), updatedAt: now } });   // R11 P1: integer halalas next to the double
  return { credited: created, balance };
}

/** A debit larger than what the ledger holds. */
export class WalletInsufficientError extends Error {
  constructor(public readonly balance: number) { super('Insufficient wallet balance'); }
}
