import { PharmacyBroadcastDispatchService } from './pharmacy-broadcast-dispatch.service';

/** Minimal in-memory domain_outbox with the three operations the dispatcher uses. */
function outboxOf(rows: any[]) {
  const matches = (r: any, f: any): boolean => Object.entries(f).every(([k, v]: [string, any]) => {
    if (k === '$or') return (v as any[]).some((alt) => matches(r, alt));
    if (v && typeof v === 'object' && '$lte' in v) return r[k] !== undefined && r[k] <= v.$lte;
    if (v && typeof v === 'object' && '$exists' in v) return (r[k] !== undefined) === v.$exists;
    return r[k] === v;
  });
  return {
    rows,
    updateMany: jest.fn(async (f: any, u: any) => { rows.filter((r) => matches(r, f)).forEach((r) => Object.assign(r, u.$set)); return {}; }),
    findOneAndUpdate: jest.fn(async (f: any, u: any, o: any) => {
      const hit = rows.filter((r) => matches(r, f)).sort((a, b) => a.created_at - b.created_at)[0];
      if (!hit) return null;
      Object.assign(hit, u.$set); hit.attempts = (hit.attempts || 0) + (u.$inc?.attempts || 0);
      return o?.returnDocument === 'after' ? hit : null;
    }),
    updateOne: jest.fn(async (f: any, u: any) => { const hit = rows.find((r) => r._id === f._id); if (hit) Object.assign(hit, u.$set); return {}; }),
  };
}

const row = (n: number, extra: any = {}) => ({ _id: `o${n}`, event_type: 'pharmacy.broadcast.recipient_added', state: 'pending', created_at: new Date(2026, 0, 1, 0, 0, n),
  payload: { broadcast_id: 'b1', pharmacy_account_id: `ph${n}`, order_id: 'ord1' }, ...extra });

function setup(rows: any[], broadcast: any = { id: 'b1', order_id: 'ord1', lock_state: 'open' }, order: any = { id: 'ord1', items: [] }) {
  const outbox = outboxOf(rows);
  const connection: any = { collection: () => outbox };
  const chain = (v: any) => ({ lean: async () => v });
  const broadcasts: any = { findOne: jest.fn(() => chain(broadcast)) };
  const orders: any = { findOne: jest.fn(() => chain(order)) };
  const notifier: any = { notifyPharmacyBroadcast: jest.fn(async () => undefined) };
  return { svc: new PharmacyBroadcastDispatchService(connection, broadcasts, orders, notifier), outbox, notifier };
}

describe('pharmacy broadcast dispatcher: a pharmacy is told about a request in its area', () => {
  it('sends the notice for every pending row, once, and marks it sent', async () => {
    const { svc, outbox, notifier } = setup([row(1), row(2)]);
    expect(await svc.dispatchDue(new Date())).toEqual({ sent: 2, skipped: 0, failed: 0, retried: 0 });
    expect(notifier.notifyPharmacyBroadcast.mock.calls.map((c: any[]) => c[0])).toEqual(['ph1', 'ph2']);
    expect(outbox.rows.map((r: any) => r.state)).toEqual(['sent', 'sent']);
    await svc.dispatchDue(new Date());
    expect(notifier.notifyPharmacyBroadcast).toHaveBeenCalledTimes(2);   // a sent row is never sent again
  });

  it('reads the pharmacy and broadcast from the idempotency key when the payload is empty', async () => {
    expect(PharmacyBroadcastDispatchService.target({ idempotency_key: 'pharmacy-broadcast-recipient:b9:ph7' })).toEqual({ broadcastId: 'b9', pharmacyId: 'ph7' });
    expect(PharmacyBroadcastDispatchService.target({ payload: { broadcast_id: 'b1', pharmacy_account_id: 'p' } })).toEqual({ broadcastId: 'b1', pharmacyId: 'p' });
    expect(PharmacyBroadcastDispatchService.target({})).toBeNull();
  });

  it('skips a request that has already been won or closed (no notice for something it can no longer answer)', async () => {
    const { svc, outbox, notifier } = setup([row(1)], { id: 'b1', order_id: 'ord1', lock_state: 'closed' });
    expect(await svc.dispatchDue(new Date())).toMatchObject({ sent: 0, skipped: 1 });
    expect(notifier.notifyPharmacyBroadcast).not.toHaveBeenCalled();
    expect(outbox.rows[0].state).toBe('skipped');
  });

  it('a failed send goes back with a delay, and gives up after five attempts', async () => {
    const now = new Date();
    const { svc, outbox, notifier } = setup([row(1)]);
    notifier.notifyPharmacyBroadcast.mockRejectedValue(new Error('push down'));
    expect(await svc.dispatchDue(now)).toMatchObject({ retried: 1, sent: 0 });
    expect(outbox.rows[0].state).toBe('pending');
    expect(outbox.rows[0].next_attempt_at.getTime()).toBeGreaterThan(now.getTime());
    expect(await svc.dispatchDue(now)).toMatchObject({ retried: 0, sent: 0 });          // not due yet
    outbox.rows[0].attempts = 4;
    const later = new Date(now.getTime() + 3_600_000);
    expect(await svc.dispatchDue(later)).toMatchObject({ failed: 1 });
    expect(outbox.rows[0].state).toBe('failed');
  });

  it('gives back a row that a dead worker left in processing', async () => {
    const now = new Date();
    const { svc, notifier } = setup([row(1, { state: 'processing', claimed_at: new Date(now.getTime() - 120_000) })]);
    expect(await svc.dispatchDue(now)).toMatchObject({ sent: 1 });
    expect(notifier.notifyPharmacyBroadcast).toHaveBeenCalledTimes(1);
  });
});
