import { ORDER_HALALA_FIELDS } from '../../schemas/order.schema';
import type { mongo } from 'mongoose';

type Db = mongo.Db;
import { isCleanSar, toHalalas } from '../../common/money';

/**
 * R11 phase P1 (expand): add an integer shadow field `<field>_halalas` next to every legacy double. Nothing existing is changed or removed, so old and new code run
 * side by side (docs/platform/R4 expand/contract). Dry run by default; apply is guarded in the CLI. Values that are not a clean 2-decimal amount (float drift,
 * 3+ decimals) are NEVER silently rounded: they are counted and listed, and the owner/finance decides per case.
 */
export interface Target { collection: string; fields: string[]; ledger?: boolean; /** negative amounts are legitimate (credit notes): keep the sign instead of listing them as unclean */ signed?: boolean }
export const TARGETS: Target[] = [
  { collection: 'transactions', fields: ['amount', 'refunded_amount'] },
  { collection: 'moyasar_payments', fields: ['amount', 'refunded_amount'] },
  { collection: 'platformledgerentries', fields: ['amount', 'gross', 'commission', 'vat'], ledger: true },
  { collection: 'wallets', fields: ['balance'] },
  { collection: 'wallet_transactions', fields: ['amount'] },
  { collection: 'einvoices', fields: ['subtotal', 'vat_amount', 'total', 'discount'], signed: true },        // credit notes are negative: shadows keep the sign
  { collection: 'refundrequests', fields: ['amount', 'amount_paid', 'refund_amount'] },       // two schemas share this collection
  { collection: 'orders', fields: ORDER_HALALA_FIELDS },
];

export interface PlanRow { collection: string; field: string; to_fill: number; unclean: number; unclean_sample: Array<{ id: unknown; value: unknown }> }

const shadow = (f: string) => `${f}_halalas`;

export async function planBackfill(db: Db, targets: Target[] = TARGETS, sample = 5): Promise<PlanRow[]> {
  const rows: PlanRow[] = [];
  for (const t of targets) {
    for (const f of t.fields) {
      const cursor = db.collection(t.collection).find({ [f]: { $type: 'number' }, [shadow(f)]: { $exists: false } }, { projection: { _id: 1, id: 1, [f]: 1 } });
      let fill = 0; let unclean = 0; const s: PlanRow['unclean_sample'] = [];
      for await (const d of cursor) {
        if (isCleanSar((d as any)[f]) && (t.signed || (d as any)[f] >= 0)) fill++;
        else { unclean++; if (s.length < sample) s.push({ id: (d as any).id ?? d._id, value: (d as any)[f] }); }
      }
      rows.push({ collection: t.collection, field: f, to_fill: fill, unclean, unclean_sample: s });
    }
  }
  return rows;
}

export async function applyBackfill(db: Db, opts: { targets?: Target[]; includeLedger?: boolean; batch?: number } = {}): Promise<{ written: number; skipped_unclean: number }> {
  const batch = opts.batch ?? 500;
  let written = 0; let skipped = 0;
  for (const t of opts.targets ?? TARGETS) {
    if (t.ledger && !opts.includeLedger) continue;     // the ledger is append-only by convention: only with an explicit flag
    for (const f of t.fields) {
      const col = db.collection(t.collection);
      let last: unknown = null;                         // page by _id: unclean rows stay unfilled and must not hide the clean rows behind them
      for (;;) {
        const filter: Record<string, unknown> = { [f]: { $type: 'number' }, [shadow(f)]: { $exists: false } };
        if (last !== null) filter._id = { $gt: last };
        const docs = await col.find(filter, { projection: { _id: 1, [f]: 1 } }).sort({ _id: 1 }).limit(batch).toArray();
        if (!docs.length) break;
        last = docs[docs.length - 1]._id;
        const ops = [];
        for (const d of docs) {
          const v = (d as any)[f];
          if (isCleanSar(v) && (t.signed || v >= 0)) ops.push({ updateOne: { filter: { _id: d._id, [shadow(f)]: { $exists: false } }, update: { $set: { [shadow(f)]: toHalalas(v) } } } });
          else skipped++;
        }
        if (ops.length) { const r = await col.bulkWrite(ops, { ordered: false }); written += r.modifiedCount; }
      }
    }
  }
  return { written, skipped_unclean: skipped };
}
