import { Connection } from 'mongoose';

/**
 * The problem-order queries behind the admin "today" screen (GET /admin/ops/alerts and the SLA tile of
 * GET /admin/command-center-v2), shared with the urgent-alert evaluator (admin/alerts) so the screen and the
 * alerts an admin receives while the screen is closed always count the same rows.
 */

export type OrderKind = 'pharmacy' | 'lab' | 'radiology' | 'nursing' | 'consultation';

/** Open states in which an order counts as stuck once it is older than the stuck threshold. */
export const STUCK_SOURCES: ReadonlyArray<{ kind: OrderKind; col: string; field: 'state' | 'status'; states: string[] }> = [
  { kind: 'pharmacy', col: 'pharmacy_orders', field: 'status', states: ['NEW_REQUEST', 'QUOTED', 'ALLOCATED', 'CONFIRMED', 'ready_for_split'] },
  { kind: 'lab', col: 'labbookings', field: 'state', states: ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY', 'CONFIRMED'] },
  { kind: 'radiology', col: 'radiologybookings', field: 'state', states: ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY', 'CONFIRMED'] },
  { kind: 'nursing', col: 'homecarebookings', field: 'state', states: ['NEW_REQUEST', 'PENDING_INSURANCE', 'CONFIRMED', 'ASSIGNED'] },
  { kind: 'consultation', col: 'appointments', field: 'status', states: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
];

/** Bookings whose `sla_due_at` passed while still in one of these non-final states breach the SLA. */
export const SLA_SOURCES: ReadonlyArray<{ kind: OrderKind; col: string; closed: string[] }> = [
  { kind: 'pharmacy', col: 'orders', closed: ['CANCELLED', 'DELIVERED'] },
  { kind: 'lab', col: 'labbookings', closed: ['CANCELLED', 'REPORTED'] },
  { kind: 'radiology', col: 'radiologybookings', closed: ['CANCELLED', 'REPORT_PUBLISHED'] },
  { kind: 'nursing', col: 'homecarebookings', closed: ['CANCELLED', 'COMPLETED'] },
];

/** Transaction statuses the today screen lists as failed payments. */
export const FAILED_PAYMENT_STATUSES = ['failed', 'cancelled'];

/** The stuck threshold the today screen uses when no admin rule overrides it (system_config.ops_stuck_minutes). */
export async function opsStuckMinutes(conn: Connection): Promise<number> {
  const cfg: { value?: { ops_stuck_minutes?: unknown } } | null = await conn.collection('system_config')
    .findOne({ key: 'system_config' } as never).catch(() => null) as never;
  const n = Number(cfg?.value?.ops_stuck_minutes ?? 30);
  return Number.isFinite(n) ? Math.max(1, n) : 30;
}

export type StuckOrder = { kind: OrderKind; id: string; state: string; since: Date };

/** Orders still open and created before `cutoff`, oldest first, at most `perKind` per kind. */
export async function findStuckOrders(conn: Connection, cutoff: Date, perKind = 50): Promise<StuckOrder[]> {
  const out: StuckOrder[] = [];
  for (const k of STUCK_SOURCES) {
    const rows: Array<Record<string, unknown>> = await conn.collection(k.col).find({
      [k.field]: { $in: k.states },
      createdAt: { $lt: cutoff },
    } as never, { projection: { _id: 0, id: 1, state: 1, status: 1, createdAt: 1, patient_id: 1, total: 1, total_price: 1 } })
      .sort({ createdAt: 1 }).limit(perKind).toArray().catch(() => []) as never;
    for (const r of rows) out.push({ kind: k.kind, id: String(r.id), state: String(r.state || r.status), since: r.createdAt as Date });
  }
  return out;
}

export type SlaBreach = { kind: OrderKind; id: string; state: string; sla_due_at: Date };

/** Bookings whose SLA due time is before `dueBefore` and that are still open. */
export function slaBreachFilter(closed: string[], dueBefore: Date) {
  return { sla_due_at: { $lt: dueBefore }, state: { $nin: closed } };
}

export async function findSlaBreaches(conn: Connection, dueBefore: Date, perKind = 200): Promise<SlaBreach[]> {
  const out: SlaBreach[] = [];
  for (const s of SLA_SOURCES) {
    const rows: Array<Record<string, unknown>> = await conn.collection(s.col)
      .find(slaBreachFilter(s.closed, dueBefore) as never, { projection: { _id: 0, id: 1, state: 1, sla_due_at: 1 } })
      .sort({ sla_due_at: 1 }).limit(perKind).toArray().catch(() => []) as never;
    for (const r of rows) out.push({ kind: s.kind, id: String(r.id), state: String(r.state), sla_due_at: new Date(r.sla_due_at as Date) });
  }
  return out;
}

/** Failed payments whose last change (`updatedAt`, set when the gateway reported the failure) is after `since`. */
export async function countFailedPaymentsSince(conn: Connection, since: Date): Promise<number> {
  return conn.collection('transactions')
    .countDocuments({ status: { $in: FAILED_PAYMENT_STATUSES }, updatedAt: { $gte: since } } as never)
    .catch(() => 0);
}
