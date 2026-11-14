import type { Connection } from 'mongoose';
import { LEDGER_TYPES } from '../finance-engine/finance-engine.module';
import { APPT_STATES } from '../../schemas/appointment.schema';

/**
 * R14: nightly invariant checks. Each one is a query over data that the application code can never legitimately produce: an impossible state, a broken link, a counter that drifted.
 * severity 'error' = impossible by the code (a bug or a manual edit); 'review' = unusual and worth a human look, but a legitimate older path may produce it.
 * Every query is bounded (sample of 5 ids, maxTimeMS) and read-only.
 */
export interface InvariantResult { id: string; severity: 'error' | 'review'; description: string; count: number; sample: unknown[] }
interface Invariant { id: string; severity: 'error' | 'review'; description: string; run: (c: Connection, now: Date) => Promise<{ count: number; sample: unknown[] }> }

const LIMIT = { maxTimeMS: 30_000 };
const ACTIVE_APPT = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'];

async function filtered(c: Connection, collection: string, filter: Record<string, unknown>, idField = 'id') {
  const col = c.collection(collection);
  const [count, rows] = await Promise.all([
    col.countDocuments(filter as any, LIMIT),
    col.find(filter as any, { projection: { [idField]: 1 }, ...LIMIT }).limit(5).toArray(),
  ]);
  return { count, sample: rows.map((r: any) => r[idField] ?? String(r._id)) };
}
async function grouped(c: Connection, collection: string, match: Record<string, unknown>, key: Record<string, string>) {
  const rows: any[] = await c.collection(collection).aggregate([{ $match: match }, { $group: { _id: key, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }, { $limit: 200 }], LIMIT as any).toArray();
  return { count: rows.length, sample: rows.slice(0, 5).map((r) => r._id) };
}

export const INVARIANTS: Invariant[] = [
  { id: 'tx_negative_amount', severity: 'error', description: 'a transaction with a negative amount or refunded_amount', run: (c) => filtered(c, 'transactions', { $or: [{ amount: { $lt: 0 } }, { refunded_amount: { $lt: 0 } }] }) },
  { id: 'tx_refunded_more_than_paid', severity: 'error', description: 'refunded_amount above amount (+0.01)', run: (c) => filtered(c, 'transactions', { $expr: { $gt: [{ $ifNull: ['$refunded_amount', 0] }, { $add: [{ $ifNull: ['$amount', 0] }, 0.01] }] } }) },
  { id: 'tx_paid_without_paid_at', severity: 'review', description: 'status paid with no paid_at (the verify and capture paths always set it)', run: (c) => filtered(c, 'transactions', { status: 'paid', paid_at: { $exists: false } }) },
  { id: 'tx_refunded_status_without_amount', severity: 'review', description: 'status refunded but refunded_amount below amount', run: (c) => filtered(c, 'transactions', { status: 'refunded', $expr: { $lt: [{ $ifNull: ['$refunded_amount', 0] }, { $subtract: [{ $ifNull: ['$amount', 0] }, 0.01] }] } }) },
  { id: 'ledger_unknown_type_or_negative', severity: 'error', description: 'a ledger row with an unknown type or a negative amount (direction is the type)', run: (c) => filtered(c, 'platformledgerentries', { $or: [{ type: { $nin: [...LEDGER_TYPES] } }, { amount: { $lt: 0 } }] }) },
  { id: 'ledger_duplicate_business_event', severity: 'error', description: 'two ledger rows for one refund / earning / clawback (type + ref_type + ref_id)', run: (c) => grouped(c, 'platformledgerentries', { type: { $in: ['refund', 'provider_earning', 'provider_debit', 'commission_reversal', 'vat_reversal'] }, ref_id: { $type: 'string' } }, { type: '$type', ref_type: '$ref_type', ref_id: '$ref_id' }) },
  { id: 'coupon_used_over_max', severity: 'error', description: 'used_count above max_uses, or negative', run: (c) => filtered(c, 'coupons', { $or: [{ used_count: { $lt: 0 } }, { $expr: { $and: [{ $ne: [{ $type: '$max_uses' }, 'missing'] }, { $ne: ['$max_uses', null] }, { $gt: ['$used_count', '$max_uses'] }] } }] }, 'code') },
  { id: 'coupon_user_counter_drift', severity: 'review', description: 'the per-user use counter (R21) differs from the number of usage rows', run: async (c) => {
      const counters: any[] = await c.collection('coupon_user_counts').find({}, { projection: { code: 1, user_id: 1, count: 1 } }).limit(2000).toArray();
      const bad: unknown[] = [];
      for (const k of counters) if (await c.collection('coupon_usages').countDocuments({ code: k.code, user_id: k.user_id }) !== k.count) bad.push(`${k.code}/${k.user_id}`);
      return { count: bad.length, sample: bad.slice(0, 5) };
    } },
  { id: 'refund_reservation_stuck', severity: 'error', description: 'a refund reservation still "reserved" after an hour (a crashed refund holds room against the cap)', run: (c, now) => filtered(c, 'refund_reservations', { state: 'reserved', createdAt: { $lt: new Date(now.getTime() - 3600_000) } }, 'refund_id') },
  { id: 'appointment_double_booked', severity: 'error', description: 'two active appointments of one doctor in one slot (the unique index should make this impossible: it is missing or was built before the duplicates)', run: (c) => grouped(c, 'appointments', { status: { $in: ACTIVE_APPT } }, { doctor_id: '$doctor_id', slot_start: '$slot_start' }) },
  { id: 'slot_lock_double_held', severity: 'error', description: 'two held/confirmed slot locks for one provider and slot start', run: (c) => grouped(c, 'slotlocks', { status: { $in: ['held', 'confirmed'] } }, { provider_id: '$provider_id', slot_start: '$slot_start' }) },
  { id: 'appointment_unknown_state', severity: 'error', description: 'an appointment whose status is outside the state machine', run: (c) => filtered(c, 'appointments', { status: { $nin: Object.values(APPT_STATES) } }) },
  { id: 'durable_events_dead', severity: 'error', description: 'an outbox event (R2) that failed all its attempts', run: (c) => filtered(c, 'durable_events', { state: 'dead' }, 'key') },
  { id: 'durable_events_stuck', severity: 'review', description: 'an outbox event pending or processing for more than 10 minutes', run: (c, now) => filtered(c, 'durable_events', { state: { $in: ['pending', 'processing'] }, created_at: { $lt: new Date(now.getTime() - 600_000) } }, 'key') },
  { id: 'ledger_order_without_booking', severity: 'review', description: 'a ledger row of the last 14 days whose order_id is no booking/order in any collection (orphan)', run: async (c, now) => {
      const ids: string[] = (await c.collection('platformledgerentries').distinct('order_id', { createdAt: { $gte: new Date(now.getTime() - 14 * 86_400_000) }, order_id: { $type: 'string' } } as any)).slice(0, 2000);
      const known = new Set<string>();
      for (const coll of ['orders', 'pharmacy_orders', 'appointments', 'labbookings', 'radiologybookings', 'homecarebookings', 'diagnosticorders']) {
        for (const r of await c.collection(coll).find({ id: { $in: ids } } as any, { projection: { id: 1 } }).toArray()) known.add((r as any).id);
      }
      const orphans = ids.filter((i) => !known.has(i));
      return { count: orphans.length, sample: orphans.slice(0, 5) };
    } },
];

export async function runInvariants(c: Connection, now = new Date(), only?: string[]): Promise<InvariantResult[]> {
  const out: InvariantResult[] = [];
  for (const inv of INVARIANTS) {
    if (only && !only.includes(inv.id)) continue;
    try { out.push({ id: inv.id, severity: inv.severity, description: inv.description, ...(await inv.run(c, now)) }); }
    catch (e: any) { out.push({ id: inv.id, severity: 'review', description: `${inv.description} (the check itself failed: ${String(e?.message).slice(0, 120)})`, count: -1, sample: [] }); }
  }
  return out;
}
