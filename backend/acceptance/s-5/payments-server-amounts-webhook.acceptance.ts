// ACCEPTANCE — S-5 payments (owner decision 2026-10-06 item 28, security sweep; Queue C D-28). Written by
// the reviewer before the work; the implementing agent makes it pass and may not edit it (nor
// live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis, with the
// Moyasar client pointed (MOYASAR_API_BASE, PAYMENT_PROVIDER=moyasar) at a local fake gateway. The API
// key and MOYASAR_WEBHOOK_SECRET are generated per run.
//
// Moyasar's webhook format (docs.moyasar.com, webhook reference): the POST body is
//   { id, type, created_at, secret_token, account_name, live, data }
// where `secret_token` is the secret set on the webhook in the Moyasar dashboard and `data` is the
// payment object (data.id is the payment id). Moyasar documents no signature header.
//
// Required
//   1. Every amount sent to the gateway comes from the server's order, never from the client: a
//      patient who sends a smaller `amount` to POST /moyasar/payments is either refused or charged the
//      order's amount; POST /payments/intent/pharmacy/:id charges the order's amount.
//   2. A payment is marked paid only when the gateway's own record says paid AND its amount and
//      currency equal what the server asked for. A gateway "paid" for a smaller amount leaves the
//      transaction and the order unpaid.
//   3. Webhooks. Every Moyasar webhook route that exists (/payments/webhook/moyasar, /moyasar/webhook,
//      /webhooks/moyasar; a removed one answers 404):
//        - refuses a request without the secret, or with a wrong one (4xx; nothing changes);
//        - never trusts the body: with the right secret, a body that says "paid" while the gateway says
//          "failed" changes nothing;
//      and at least one of them, given the right secret and Moyasar's real body, settles the
//      payment the server created (transaction paid) after reading it back from the gateway.
import * as http from 'http';
import { AddressInfo } from 'net';
import { randomBytes } from 'crypto';
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const KEY = randomBytes(16).toString('hex');
const HOOK_SECRET = randomBytes(24).toString('hex');
const ROUTES = ['/api/v1/payments/webhook/moyasar', '/api/v1/moyasar/webhook', '/api/v1/webhooks/moyasar'];

describe('S-5: amounts come from the server; webhooks are authenticated and never trusted', () => {
  const stack = new LiveStack();
  let gateway: http.Server;
  let patient = '';
  let seq = 0;
  const created: Array<{ id: string; amount: number }> = [];
  const state: Record<string, { status: string; amount: number }> = {};

  const order = (id: string) => ({
    id, patient_account_id: 'pat-1', fulfillment: 'delivery', items: [{ id: `${id}-i1`, raw_name: 'Panadol', qty: 1 }], timeline: [],
    status: 'cash_card_payment_pending', payment_method: 'card', coverage_mode: 'cash', quote_accepted_at: new Date(),
    selected_offer_id: `off-${id}`, selected_offer_version: 1, selected_allocation_id: `al-${id}`,
    totals: { subtotal: 100, delivery_fee: 15, total: 115, currency: 'SAR' },
    pricing_snapshot: { offer_id: `off-${id}`, offer_version: 1, totals: { subtotal: 100, delivery_fee: 15, total: 115, currency: 'SAR' }, hash: 'f'.repeat(64), captured_at: new Date() },
    createdAt: new Date(), updatedAt: new Date(),
  });
  const ORDERS = ['o-intent', 'o-moy', 'o-short', 'o-hook-0', 'o-hook-1', 'o-hook-2'];

  /** Creates the server's payment for an order through the real route; returns {txn, gatewayId}. */
  const pay = async (orderId: string) => {
    const r = await stack.call(0, 'POST', `/api/v1/payments/intent/pharmacy/${orderId}`, patient, {});
    expect(r.status).toBeLessThan(300);
    const t = await stack.db.collection('transactions').findOne({ booking_id: orderId });
    expect(t?.gateway_intent_id).toBeTruthy();
    return { txn: String(t!.id), gatewayId: String(t!.gateway_intent_id) };
  };
  const txnStatus = async (id: string) => (await stack.db.collection('transactions').findOne({ id }))?.status;
  const hook = (route: string, secret: string | undefined, paymentId: string, bodyStatus = 'paid') => {
    const body: Record<string, unknown> = {
      id: `evt_${randomBytes(6).toString('hex')}`, type: `payment_${bodyStatus}`, created_at: new Date().toISOString(),
      account_name: 'nabd', live: false, data: { id: paymentId, status: bodyStatus, amount: 11500, currency: 'SAR' },
    };
    if (secret !== undefined) body.secret_token = secret;
    return stack.call(0, 'POST', route, undefined, body);
  };

  beforeAll(async () => {
    gateway = http.createServer((req, res) => {
      const ok = req.headers.authorization === `Basic ${Buffer.from(`${KEY}:`).toString('base64')}`;
      if (!ok) { res.writeHead(401); res.end('{}'); return; }
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', () => {
        res.setHeader('content-type', 'application/json');
        if (req.method === 'POST' && /\/payments\/?$/.test(String(req.url))) {
          const b = JSON.parse(raw || '{}');
          const id = `pay_${++seq}`;
          created.push({ id, amount: Number(b.amount) });
          state[id] = { status: 'initiated', amount: Number(b.amount) };
          res.end(JSON.stringify({ id, status: 'initiated', amount: b.amount, currency: b.currency || 'SAR', source: { type: 'creditcard', transaction_url: `https://pay.test/${id}` } }));
          return;
        }
        const m = /\/payments\/([^/?]+)$/.exec(String(req.url));
        if (req.method === 'GET' && m && state[m[1]]) {
          res.end(JSON.stringify({ id: m[1], status: state[m[1]].status, amount: state[m[1]].amount, currency: 'SAR', source: { type: 'creditcard' } }));
          return;
        }
        res.writeHead(404); res.end('{}');
      });
    });
    await new Promise<void>((r) => gateway.listen(0, '127.0.0.1', () => r()));
    const base = `http://127.0.0.1:${(gateway.address() as AddressInfo).port}/v1`;
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('pharmacy_orders').insertMany(ORDERS.map(order));
    }, { PAYMENT_PROVIDER: 'moyasar', MOYASAR_API_KEY: KEY, MOYASAR_SECRET_KEY: KEY, MOYASAR_API_BASE: base, MOYASAR_WEBHOOK_SECRET: HOOK_SECRET });
    patient = await stack.patient('pat-1');
  });
  afterAll(async () => { await stack.stop(); gateway?.close(); });

  it('the payment intent charges the order amount (115 SAR = 11500 halalas)', async () => {
    const { gatewayId } = await pay('o-intent');
    expect(created.find((c) => c.id === gatewayId)?.amount).toBe(11500);
  });

  it('a smaller amount sent by the client is never charged', async () => {
    const before = created.length;
    const r = await stack.call(0, 'POST', '/api/v1/moyasar/payments', patient, { booking_id: 'o-moy', booking_kind: 'pharmacy', amount: 1 });
    const sent = created.slice(before).map((c) => c.amount);
    for (const a of sent) expect(a).toBe(11500);
    if (r.status < 300) expect(sent).toEqual([11500]);
  });

  it('a gateway "paid" for less than the server asked for does not mark the payment paid', async () => {
    const { txn, gatewayId } = await pay('o-short');
    state[gatewayId] = { status: 'paid', amount: 100 };
    await stack.call(0, 'POST', `/api/v1/payments/verify/${txn}`, patient, {});
    expect(await txnStatus(txn)).not.toBe('paid');
    expect((await stack.db.collection('pharmacy_orders').findOne({ id: 'o-short' }))?.payment_status).not.toBe('paid');
  });

  ROUTES.forEach((route, i) => {
    describe(route, () => {
      let txn = '';
      let gatewayId = '';
      let removed = false;
      beforeAll(async () => { ({ txn, gatewayId } = await pay(`o-hook-${i}`)); });

      it('refuses a webhook without the secret or with a wrong one', async () => {
        state[gatewayId] = { status: 'paid', amount: 11500 };
        const none = await hook(route, undefined, gatewayId);
        removed = none.status === 404;
        expect(none.status).toBeGreaterThanOrEqual(400);
        expect(none.status).toBeLessThan(500);
        const wrong = await hook(route, randomBytes(24).toString('hex'), gatewayId);
        expect(wrong.status).toBeGreaterThanOrEqual(400);
        expect(wrong.status).toBeLessThan(500);
        expect(await txnStatus(txn)).not.toBe('paid');
      });

      it('with the right secret, a body saying "paid" is not trusted when the gateway says failed', async () => {
        state[gatewayId] = { status: 'failed', amount: 11500 };
        await hook(route, HOOK_SECRET, gatewayId, 'paid');
        expect(await txnStatus(txn)).not.toBe('paid');
      });

      it('with the right secret and a paid gateway record, the route settles the payment (or the route is removed: 404)', async () => {
        state[gatewayId] = { status: 'paid', amount: 11500 };
        const r = await hook(route, HOOK_SECRET, gatewayId, 'paid');
        if (removed) { expect(r.status).toBe(404); return; }
        expect(r.status).toBeLessThan(300);
        expect(await txnStatus(txn)).toBe('paid');
      });
    });
  });

  it('at least one webhook route settles a real Moyasar webhook', async () => {
    const settled = await Promise.all(ORDERS.filter((o) => o.startsWith('o-hook')).map(async (o) => (await stack.db.collection('transactions').findOne({ booking_id: o }))?.status));
    expect(settled).toContain('paid');
  });
});
