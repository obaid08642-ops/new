// ACCEPTANCE — Q-21 a paid pharmacy order reaches CONFIRMED (docs/review/OPENCODE_QUEUE.md; found while
// writing the Q-3 spec). Written by the reviewer before the work; the implementing agent makes it pass
// and may not edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis, with the
// Moyasar client pointed (MOYASAR_API_BASE, PAYMENT_PROVIDER=moyasar) at a local fake gateway; keys are
// generated per run. Payment is confirmed exactly as in production: POST /payments/verify/:txn.
//
// Required
//   - Card order, final quote accepted, a payment in progress: governed_state PAYMENT_PENDING.
//   - Once the gateway says paid: order `status` = confirmed and governed_state = CONFIRMED.
//   - Insurance partial decision, co-pay accepted, co-pay paid: `status` = confirmed, governed CONFIRMED.
//   - A failed payment changes nothing (control).
import * as http from 'http';
import { AddressInfo } from 'net';
import { randomBytes } from 'crypto';
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const KEY = randomBytes(16).toString('hex');

describe('Q-21: a paid pharmacy order is confirmed', () => {
  const stack = new LiveStack();
  let gateway: http.Server;
  let patient = '';
  const snapshot = (id: string, total: number) => ({ offer_id: `off-${id}`, offer_version: 1, totals: { subtotal: total - 15, delivery_fee: 15, total, currency: 'SAR' }, hash: 'f'.repeat(64), captured_at: new Date() });
  const order = (id: string, extra: Record<string, unknown>) => ({
    id, patient_account_id: 'pat-1', fulfillment: 'delivery', items: [{ id: `${id}-i1`, raw_name: 'Panadol', qty: 1 }], timeline: [],
    selected_offer_id: `off-${id}`, selected_offer_version: 1, selected_allocation_id: `al-${id}`, createdAt: new Date(), updatedAt: new Date(), ...extra,
  });
  const txn = (id: string, bookingId: string, amount: number, gatewayId: string) => ({
    id, booking_kind: 'pharmacy', booking_id: bookingId, patient_id: 'pat-1', amount, currency: 'SAR', gateway: 'moyasar', method: 'card',
    status: 'pending', gateway_intent_id: gatewayId, createdAt: new Date(), updatedAt: new Date(),
  });
  const detail = async (id: string) => (await stack.call(0, 'GET', `/api/v1/patient/pharmacy/orders/${id}`, patient)).body;

  beforeAll(async () => {
    gateway = http.createServer((req, res) => {
      const ok = req.headers.authorization === `Basic ${Buffer.from(`${KEY}:`).toString('base64')}`;
      const m = /\/payments\/([^/?]+)$/.exec(String(req.url));
      if (!ok || !m || req.method !== 'GET') { res.writeHead(401); res.end('{}'); return; }
      const amounts: Record<string, number> = { pay_card: 11500, pay_copay: 4000, pay_failed: 11500 };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: m[1], status: m[1] === 'pay_failed' ? 'failed' : 'paid', amount: amounts[m[1]] ?? 0, currency: 'SAR', source: { type: 'creditcard' } }));
    });
    await new Promise<void>((r) => gateway.listen(0, '127.0.0.1', () => r()));
    const base = `http://127.0.0.1:${(gateway.address() as AddressInfo).port}/v1`;
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('pharmacy_orders').insertMany([
        order('o-card', { status: 'cash_card_payment_pending', payment_method: 'card', coverage_mode: 'cash', quote_accepted_at: new Date(), totals: snapshot('o-card', 115).totals, pricing_snapshot: snapshot('o-card', 115) }),
        order('o-fail', { status: 'cash_card_payment_pending', payment_method: 'card', coverage_mode: 'cash', quote_accepted_at: new Date(), totals: snapshot('o-fail', 115).totals, pricing_snapshot: snapshot('o-fail', 115) }),
        order('o-copay', {
          status: 'waiting_copay', payment_method: 'insurance', coverage_mode: 'insurance', totals: snapshot('o-copay', 100).totals, pricing_snapshot: snapshot('o-copay', 100),
          insurance_decision: { outcome: 'partial', approval_reference: 'APR-1', offer_id: 'off-o-copay', offer_version: 1, allocation_id: 'al-o-copay', quote_total: 100, insurer_share: 60, patient_share: 40, currency: 'SAR', items: [], decided_by: 'ph-1', decided_at: new Date(),
            patient_acceptance: { kind: 'co-pay', payment_method: 'card', idempotency_key: 'copay-key-00000001', accepted_at: new Date() } },
        }),
      ]);
      await db.collection('transactions').insertMany([
        txn('txn-card', 'o-card', 115, 'pay_card'), txn('txn-copay', 'o-copay', 40, 'pay_copay'), txn('txn-fail', 'o-fail', 115, 'pay_failed'),
      ]);
    }, { PAYMENT_PROVIDER: 'moyasar', MOYASAR_API_KEY: KEY, MOYASAR_SECRET_KEY: KEY, MOYASAR_API_BASE: base });
    patient = await stack.patient('pat-1');
  });
  afterAll(async () => { await stack.stop(); gateway?.close(); });

  it('card, quote accepted, payment in progress -> PAYMENT_PENDING', async () => {
    expect((await detail('o-card')).governed_state).toBe('PAYMENT_PENDING');
  });

  it('card paid -> status confirmed and governed CONFIRMED', async () => {
    const r = await stack.call(0, 'POST', '/api/v1/payments/verify/txn-card', patient, {});
    expect(r.status).toBeLessThan(300);
    expect((await stack.db.collection('pharmacy_orders').findOne({ id: 'o-card' }))?.status).toBe('confirmed');
    expect((await detail('o-card')).governed_state).toBe('CONFIRMED');
  });

  it('co-pay paid -> status confirmed and governed CONFIRMED', async () => {
    const r = await stack.call(0, 'POST', '/api/v1/payments/verify/txn-copay', patient, {});
    expect(r.status).toBeLessThan(300);
    expect((await stack.db.collection('pharmacy_orders').findOne({ id: 'o-copay' }))?.status).toBe('confirmed');
    expect((await detail('o-copay')).governed_state).toBe('CONFIRMED');
  });

  it('control: a failed payment changes nothing', async () => {
    await stack.call(0, 'POST', '/api/v1/payments/verify/txn-fail', patient, {});
    const o = await stack.db.collection('pharmacy_orders').findOne({ id: 'o-fail' });
    expect(o?.status).toBe('cash_card_payment_pending');
    expect(o?.payment_status).not.toBe('paid');
  });
});
