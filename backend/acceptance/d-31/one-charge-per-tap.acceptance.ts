// ACCEPTANCE — D-31 double taps and bad networks, server side (owner decision 2026-10-06 item 31; Queue C
// D-31). Written by the reviewer before the work; the implementing agent makes it pass and may not edit it
// (nor live-server.ts next to it). The client side (buttons, same key on retry, offline) is in
// patient-web/acceptance/d-31 and patient-app/acceptance/d-31.
//
// The whole compiled backend runs as TWO instances (dist/main.js) on an in-memory MongoDB and one local
// Redis, with the Moyasar client pointed at a local fake gateway whose answer can be slowed down. Keys
// are generated per run.
//
// Required (Pay, Book and Send charge, book or create once):
//   1. Pay: two requests with the same Idempotency-Key at the same moment, on different instances,
//      reach the gateway once; every successful answer names the same transaction.
//   2. Pay on a slow network: the client gives up while the gateway is still answering and retries
//      with the same key (an in-progress answer, 409, is allowed while the first one runs); once the
//      first finishes, the retry returns the same transaction. The gateway saw one charge.
//   3. Pay tapped twice with two different keys (an older client): still one live charge.
//   4. Pay result check: after a lost answer the same-key retry returns the transaction, and the result
//      check the clients use (POST /payments/verify/:txn) answers for it without a new charge.
//   5. Book: the same consultation booking sent twice with one key (two instances, same moment)
//      creates one appointment; the same slot sent with a second key is refused (no double booking).
//   6. Send: the same pharmacy order sent twice with one key (two instances, same moment) creates one
//      order.
import * as http from 'http';
import { AddressInfo } from 'net';
import { randomBytes } from 'crypto';
import { LiveStack } from './live-server';

jest.setTimeout(900_000);

const KEY = randomBytes(16).toString('hex');
const MIN = 60_000;
const ALL_DAY = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '00:00', close: '00:00' }));

describe('D-31: one charge, one booking, one order per tap', () => {
  const stack = new LiveStack();
  let gateway: http.Server;
  let patient = '';
  let delayMs = 0;
  let seq = 0;
  const charges: Array<{ id: string; amount: number }> = [];

  const order = (id: string) => ({
    id, patient_account_id: 'pat-1', fulfillment: 'delivery', items: [{ id: `${id}-i1`, raw_name: 'Panadol', qty: 1 }], timeline: [],
    status: 'cash_card_payment_pending', payment_method: 'card', coverage_mode: 'cash', quote_accepted_at: new Date(),
    selected_offer_id: `off-${id}`, selected_offer_version: 1, selected_allocation_id: `al-${id}`,
    totals: { subtotal: 100, delivery_fee: 15, total: 115, currency: 'SAR' },
    pricing_snapshot: { offer_id: `off-${id}`, offer_version: 1, totals: { subtotal: 100, delivery_fee: 15, total: 115, currency: 'SAR' }, hash: 'f'.repeat(64), captured_at: new Date() },
    createdAt: new Date(), updatedAt: new Date(),
  });

  /** A raw call with a chosen key (the harness's call() makes a fresh key per request). */
  const send = async (i: number, method: string, path: string, key: string, body?: unknown, timeoutMs?: number) => {
    const ctl = new AbortController();
    const timer = timeoutMs ? setTimeout(() => ctl.abort(), timeoutMs) : undefined;
    try {
      const res = await fetch(`${stack.servers[i].url}${path}`, {
        method, signal: ctl.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${patient}`, 'idempotency-key': key },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { json = text; }
      return { status: res.status, body: json };
    } catch (e) {
      return { status: 0, body: String(e) }; // the client gave up (timeout) or lost the connection
    } finally { if (timer) clearTimeout(timer); }
  };
  const txnId = (b: any) => b?.id ?? b?.transaction_id ?? b?.data?.id ?? null;
  const chargesFor = (from: number) => charges.slice(from);

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
          charges.push({ id, amount: Number(b.amount) });
          setTimeout(() => res.end(JSON.stringify({ id, status: 'initiated', amount: b.amount, currency: 'SAR', source: { type: 'creditcard', transaction_url: `https://pay.test/${id}` } })), delayMs);
          return;
        }
        res.writeHead(404); res.end('{}');
      });
    });
    await new Promise<void>((r) => gateway.listen(0, '127.0.0.1', () => r()));
    const base = `http://127.0.0.1:${(gateway.address() as AddressInfo).port}/v1`;
    LiveStack.build();
    await stack.start(2, async (db) => {
      await db.collection('pharmacy_orders').insertMany(['o-same', 'o-slow', 'o-two-keys'].map(order));
      await db.collection('provider_profiles').insertOne({
        id: 'doc-1', user_id: 'acc-doc-1', account_id: 'acc-doc-1', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved',
        name_ar: 'د. أحمد', specialty: 'general', consultation_modes: ['clinic'], working_hours: ALL_DAY, price_clinic: 200,
      });
    }, { PAYMENT_PROVIDER: 'moyasar', MOYASAR_API_KEY: KEY, MOYASAR_SECRET_KEY: KEY, MOYASAR_API_BASE: base });
    patient = await stack.patient('pat-1');
  });
  afterAll(async () => { await stack.stop(); gateway?.close(); });

  it('Pay: the same key at the same moment on two instances charges once', async () => {
    const before = charges.length;
    const key = `pay-same-${randomBytes(8).toString('hex')}`;
    const [a, b] = await Promise.all([0, 1].map((i) => send(i, 'POST', '/api/v1/payments/intent/pharmacy/o-same', key, {})));
    expect(chargesFor(before)).toHaveLength(1);
    const ok = [a, b].filter((r) => r.status >= 200 && r.status < 300);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const r of [a, b]) if (!(r.status >= 200 && r.status < 300)) expect(r.status).toBe(409);
    expect(new Set(ok.map((r) => txnId(r.body))).size).toBe(1);
    const again = await send(0, 'POST', '/api/v1/payments/intent/pharmacy/o-same', key, {});
    expect(again.status).toBeLessThan(300);
    expect(txnId(again.body)).toBe(txnId(ok[0].body));
    expect(chargesFor(before)).toHaveLength(1);
  });

  it('Pay on a slow network: give up, retry with the same key, one charge, same transaction', async () => {
    const before = charges.length;
    const key = `pay-slow-${randomBytes(8).toString('hex')}`;
    delayMs = 4000;
    const first = await send(0, 'POST', '/api/v1/payments/intent/pharmacy/o-slow', key, {}, 800);
    expect(first.status).toBe(0); // the client gave up
    const during = await send(1, 'POST', '/api/v1/payments/intent/pharmacy/o-slow', key, {});
    expect([200, 201, 409]).toContain(during.status);
    await new Promise((r) => setTimeout(r, 5000));
    delayMs = 0;
    const after = await send(1, 'POST', '/api/v1/payments/intent/pharmacy/o-slow', key, {});
    expect(after.status).toBeLessThan(300);
    expect(chargesFor(before)).toHaveLength(1);
    // The result check the clients use (POST /payments/verify/:txn) works on the transaction the retry returned.
    const check = await send(0, 'POST', `/api/v1/payments/verify/${txnId(after.body)}`, `verify-${randomBytes(8).toString('hex')}`, {});
    expect(check.status).toBeLessThan(300);
    expect(chargesFor(before)).toHaveLength(1);
  });

  it('Pay tapped twice with two different keys: still one live charge', async () => {
    const before = charges.length;
    const a = await send(0, 'POST', '/api/v1/payments/intent/pharmacy/o-two-keys', `pay-k1-${randomBytes(8).toString('hex')}`, {});
    const b = await send(1, 'POST', '/api/v1/payments/intent/pharmacy/o-two-keys', `pay-k2-${randomBytes(8).toString('hex')}`, {});
    expect(a.status).toBeLessThan(300);
    expect(b.status).toBeLessThan(300);
    expect(txnId(b.body)).toBe(txnId(a.body));
    expect(chargesFor(before)).toHaveLength(1);
  });

  it('Book: the same booking twice with one key creates one appointment; a second key for the slot is refused', async () => {
    const slot = new Date(Math.ceil((Date.now() + 2 * 86_400_000) / (30 * MIN)) * 30 * MIN).toISOString();
    const body = { doctor_id: 'doc-1', service_type: 'clinic', slot_start: slot, payment_method: 'card' };
    const key = `book-${randomBytes(8).toString('hex')}`;
    const [a, b] = await Promise.all([0, 1].map((i) => send(i, 'POST', '/api/v1/care/appointments', key, body)));
    const ok = [a, b].filter((r) => r.status >= 200 && r.status < 300);
    expect([a.status, b.status, JSON.stringify(a.body).slice(0, 200)]).toEqual([expect.any(Number), expect.any(Number), expect.any(String)]);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const r of [a, b]) if (!(r.status >= 200 && r.status < 300)) expect(r.status).toBe(409);
    expect(await stack.db.collection('appointments').countDocuments({ patient_id: 'pat-1', doctor_id: 'doc-1', status: { $nin: ['CANCELLED', 'cancelled'] } })).toBe(1);
    const other = await send(0, 'POST', '/api/v1/care/appointments', `book-2-${randomBytes(8).toString('hex')}`, body);
    expect(other.status).toBeGreaterThanOrEqual(400);
    expect(await stack.db.collection('appointments').countDocuments({ patient_id: 'pat-1', doctor_id: 'doc-1', status: { $nin: ['CANCELLED', 'cancelled'] } })).toBe(1);
  });

  it('Send: the same pharmacy order twice with one key creates one order', async () => {
    const before = await stack.db.collection('pharmacy_orders').countDocuments({ patient_account_id: 'pat-1' });
    const body = { delivery_address: { label: 'home', city: 'Riyadh', lat: 24.7, lng: 46.7 }, fulfillment: 'delivery', payment_mode: 'cash', items: [{ raw_name: 'Panadol', qty: 1, intake_source: 'cart' }] };
    const key = `send-${randomBytes(8).toString('hex')}`;
    const [a, b] = await Promise.all([0, 1].map((i) => send(i, 'POST', '/api/v1/patient/pharmacy/orders', key, body)));
    const ok = [a, b].filter((r) => r.status >= 200 && r.status < 300);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const r of [a, b]) if (!(r.status >= 200 && r.status < 300)) expect(r.status).toBe(409);
    expect(await stack.db.collection('pharmacy_orders').countDocuments({ patient_account_id: 'pat-1' })).toBe(before + 1);
  });
});
