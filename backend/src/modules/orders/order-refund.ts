/**
 * The refund status of a patient's order (PD-819: the refund tab of the app). Built from the three places a refund leaves a trace:
 *   - the refund REQUEST the patient made (`refundrequests`: REQUESTED, APPROVED, REJECTED, FAILED, EXECUTED),
 *   - the refund that was EXECUTED (`platformledgerentries`, type refund: the amount, the method, the date),
 *   - the order itself (`refund_status: 'REFUNDED'` and `refunded_at`, written when a paid order is cancelled and refunded).
 * `null` = nothing to show. Only the patient's own orders are ever read; the view carries no account, gateway or ledger identifiers.
 */
export type OrderRefundState = 'requested' | 'approved' | 'rejected' | 'failed' | 'refunded';

export interface OrderRefund {
  state: OrderRefundState;
  /** The amount refunded (state refunded), or the amount the policy would refund (requested / approved); null when unknown. */
  amount: number | null;
  /** True when what was refunded is less than what the order cost. */
  partial: boolean;
  method: string | null;
  reason: string | null;
  requested_at: string | null;
  refunded_at: string | null;
}

const iso = (v: unknown): string | null => {
  const d = v instanceof Date ? v : v ? new Date(String(v)) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};
const money = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
const REQUEST_STATE: Record<string, OrderRefundState | undefined> = { REQUESTED: 'requested', APPROVED: 'approved', REJECTED: 'rejected', FAILED: 'failed', EXECUTED: 'refunded' };

export function refundView(order: any, requests: any[], ledger: any[]): OrderRefund | null {
  const total = money(order?.total) ?? money(order?.total_price);
  const executed = ledger.filter((l) => l && l.type === 'refund');
  if (executed.length) {
    const amount = money(executed.reduce((s, l) => s + (Number(l.amount) || 0), 0));
    const last = [...executed].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
    const request = requests[0];
    return {
      state: 'refunded', amount, partial: amount !== null && total !== null && amount < total, method: last.meta?.method ?? null,
      reason: request?.reason ?? last.description ?? null, requested_at: iso(request?.createdAt), refunded_at: iso(last.createdAt),
    };
  }
  const request = [...requests].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
  const state = request ? REQUEST_STATE[String(request.state)] : undefined;
  if (request && state) {
    const amount = money(request.refund_amount);
    return {
      state, amount, partial: amount !== null && total !== null && amount < total, method: null, reason: request.reason ?? null,
      requested_at: iso(request.createdAt), refunded_at: state === 'refunded' ? iso(request.updatedAt) : null,
    };
  }
  if (String(order?.refund_status || '').toUpperCase() === 'REFUNDED') {
    return { state: 'refunded', amount: total, partial: false, method: null, reason: null, requested_at: null, refunded_at: iso(order?.refunded_at) };
  }
  return null;
}

/** The orders with their `refund` (null when none). One read of the requests and one of the ledger for the whole list. */
export async function withRefunds<T extends { id?: string }>(
  conn: { collection(name: string): { find(f: Record<string, unknown>, o?: Record<string, unknown>): { toArray(): Promise<any[]> } } },
  patientId: string, orders: T[],
): Promise<Array<T & { refund: OrderRefund | null }>> {
  const ids = orders.map((o) => o.id).filter((id): id is string => typeof id === 'string');
  if (!ids.length) return orders.map((o) => ({ ...o, refund: null }));
  const [requests, ledger] = await Promise.all([
    conn.collection('refundrequests').find({ patient_id: patientId, booking_id: { $in: ids } }, { projection: { _id: 0, booking_id: 1, state: 1, refund_amount: 1, reason: 1, createdAt: 1, updatedAt: 1 } }).toArray(),
    conn.collection('platformledgerentries').find({ type: 'refund', order_id: { $in: ids }, 'meta.patient_id': patientId }, { projection: { _id: 0, order_id: 1, type: 1, amount: 1, description: 1, createdAt: 1, 'meta.method': 1 } }).toArray(),
  ]);
  const by = <R extends { [k: string]: any }>(rows: R[], key: string) => {
    const m = new Map<string, R[]>();
    for (const r of rows) m.set(String(r[key]), [...(m.get(String(r[key])) ?? []), r]);
    return m;
  };
  const reqBy = by(requests, 'booking_id');
  const ledBy = by(ledger, 'order_id');
  return orders.map((o) => ({ ...o, refund: refundView(o, reqBy.get(String(o.id)) ?? [], ledBy.get(String(o.id)) ?? []) }));
}
