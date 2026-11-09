import { APPOINTMENT_HALALA_FIELDS } from '../../schemas/appointment.schema';
import { LAB_BOOKING_HALALA_FIELDS } from '../../schemas/lab.schema';
import { RADIOLOGY_BOOKING_HALALA_FIELDS } from '../../schemas/radiology.schema';
import { HOME_CARE_BOOKING_HALALA_FIELDS } from '../../schemas/home-care.schema';
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
  { collection: 'appointments', fields: APPOINTMENT_HALALA_FIELDS },
  { collection: 'labbookings', fields: LAB_BOOKING_HALALA_FIELDS },
  { collection: 'radiologybookings', fields: RADIOLOGY_BOOKING_HALALA_FIELDS },
  { collection: 'homecarebookings', fields: HOME_CARE_BOOKING_HALALA_FIELDS },
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

export interface ShadowRow { collection: string; field: string; doubles: number; shadow_present: number; shadow_disagree: number }

/**
 * R11 gate check, READ-ONLY: for every double that already has its integer shadow, does the shadow equal what `toHalalas` makes of the double? A disagreement of even one halala
 * means a write changed the double without the shadow (a raw `collection()` write that skipped `common/halala-shadow.ts`). A shadow that is not a number, or a double that
 * `toHalalas` rejects, counts as a disagreement. Counts only: no id and no value leaves this function.
 */
export async function checkShadows(db: Db, targets: Target[] = TARGETS): Promise<ShadowRow[]> {
  const rows: ShadowRow[] = [];
  for (const t of targets) {
    for (const f of t.fields) {
      const col = db.collection(t.collection);
      const doubles = await col.countDocuments({ [f]: { $type: 'number' } });
      let present = 0; let disagree = 0;
      const cursor = col.find({ [f]: { $type: 'number' }, [shadow(f)]: { $exists: true } }, { projection: { _id: 0, [f]: 1, [shadow(f)]: 1 } });
      for await (const d of cursor) {
        present++;
        const have = (d as any)[shadow(f)];
        let want: number | undefined;
        try { want = toHalalas((d as any)[f]); } catch { want = undefined; }
        if (typeof have !== 'number' || want === undefined || have !== want) disagree++;
      }
      rows.push({ collection: t.collection, field: f, doubles, shadow_present: present, shadow_disagree: disagree });
    }
  }
  return rows;
}

/** The `halala-counts:` lines the ops task prints: per collection.field and one total. Names and counts only. */
export function halalaCountLines(plan: PlanRow[], shadows: ShadowRow[]): string[] {
  const out: string[] = [];
  let missing = 0; let unclean = 0; let disagree = 0;
  for (const p of plan) {
    const sh = shadows.find((x) => x.collection === p.collection && x.field === p.field);
    const m = p.to_fill + p.unclean;
    missing += m; unclean += p.unclean; disagree += sh?.shadow_disagree ?? 0;
    out.push(`halala-counts: ${p.collection}.${p.field} doubles=${sh?.doubles ?? 0} missing_shadow=${m} (clean=${p.to_fill} unclean=${p.unclean}) shadow_present=${sh?.shadow_present ?? 0} shadow_disagree=${sh?.shadow_disagree ?? 0}`);
  }
  out.push(`halala-counts: TOTAL fields=${plan.length} missing_shadow=${missing} unclean=${unclean} shadow_disagree=${disagree}`);
  return out;
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
