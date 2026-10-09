// ACCEPTANCE — D-13 offers waiting: a clear state, never an endless wait (owner decision 2026-10-06
// item 13, issue #332; Queue C; with Q-3). Written by the reviewer before the work; the implementing
// agent makes it pass and may not edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
//
// Required (GET /api/v1/patient/pharmacy/orders/:id, the patient's own order)
//   - While broadcasting, the order carries `search: { state: 'expanding', round, radius_km, ends_at }`
//     from its broadcast (round number, current radius, when this round ends).
//   - When the broadcast closed without any offer selected (the durable expiry command closes it and
//     the order goes to manual_review with timeline `broadcast_expired_manual_review`), the patient
//     sees `search.state = 'no_pharmacy_available'` and governed_state `AUTO_CANCELLED`
//     (PHARMACY_TRANSITIONS: ORDER_BROADCASTING -> AUTO_CANCELLED), and has a notification saying so.
//   - The expiry command itself (POST /api/v1/admin/pharmacy/broadcasts/expire-due) produces that end
//     state for an expired final round.
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const MIN = 60_000;

describe('D-13: no endless wait for pharmacy offers', () => {
  const stack = new LiveStack();
  let patient = '';
  let admin = '';
  const order = (id: string, status: string, timeline: unknown[] = []) => ({
    id, patient_account_id: 'pat-1', status, payment_method: 'card', fulfillment: 'delivery', items: [{ id: `${id}-i`, raw_name: 'Panadol', qty: 1 }],
    timeline: [{ ts: new Date(), event: 'created' }, ...timeline], totals: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' }, createdAt: new Date(), updatedAt: new Date(),
  });

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('system_configs').insertOne({ key: 'pharmacy_broadcast_stages', value: [{ stage: 1, radius_km: 3, timeout_seconds: 300 }, { stage: 2, radius_km: 7, timeout_seconds: 300 }] });
      await db.collection('pharmacy_orders').insertMany([
        order('o-searching', 'broadcasting', [{ ts: new Date(), event: 'broadcasting_round_1', meta: { radius: 3 } }]),
        order('o-closed', 'manual_review', [{ ts: new Date(), event: 'broadcast_expired_manual_review' }]),
        order('o-expiring', 'broadcasting', [{ ts: new Date(), event: 'broadcasting_round_1', meta: { radius: 3 } }]),
      ]);
      const bc = (id: string, orderId: string, extra: Record<string, unknown>) => ({ id, order_id: orderId, patient_account_id: 'pat-1', current_round: 2, current_radius_km: 7, max_radius_km: 7, round_radii_km: [3, 7], lock_state: 'open', notified_pharmacies: [], responses: [], timeline: [], ...extra });
      await db.collection('pharmacy_broadcasts').insertMany([
        bc('bc-s', 'o-searching', { round_expires_at: new Date(Date.now() + 4 * MIN) }),
        bc('bc-c', 'o-closed', { lock_state: 'closed', round_expires_at: null }),
        bc('bc-x', 'o-expiring', { current_round: 3, extended_stage: true, round_expires_at: new Date(Date.now() - MIN) }),
      ]);
    });
    patient = await stack.patient('pat-1');
    admin = await stack.admin('adm-1');
  });
  afterAll(async () => { await stack.stop(); });

  const detail = async (id: string) => {
    const r = await stack.call(0, 'GET', `/api/v1/patient/pharmacy/orders/${id}`, patient);
    expect(r.status).toBe(200);
    return r.body;
  };

  it('while searching the patient sees the round, the radius and when it ends', async () => {
    const d = await detail('o-searching');
    expect(d?.search).toMatchObject({ state: 'expanding', round: 2, radius_km: 7 });
    expect(Date.parse(d?.search?.ends_at)).toBeGreaterThan(Date.now());
  });

  it('a closed broadcast without an offer says "no pharmacy available" (AUTO_CANCELLED)', async () => {
    const d = await detail('o-closed');
    expect(d?.search?.state).toBe('no_pharmacy_available');
    expect(d?.governed_state).toBe('AUTO_CANCELLED');
  });

  it('the expiry command closes an expired final round into that state and tells the patient', async () => {
    const r = await stack.call(0, 'POST', '/api/v1/admin/pharmacy/broadcasts/expire-due', admin, {});
    expect(r.status).toBeLessThan(300);
    const d = await detail('o-expiring');
    expect(d?.search?.state).toBe('no_pharmacy_available');
    expect(d?.governed_state).toBe('AUTO_CANCELLED');
    const n = await stack.db.collection('notifications').findOne({ user_id: 'pat-1', $or: [{ 'params.order_id': 'o-expiring' }, { 'action.route': { $regex: 'o-expiring' } }] });
    expect(n).toBeTruthy();
  });
});
