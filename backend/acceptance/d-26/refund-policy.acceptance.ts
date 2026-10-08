// ACCEPTANCE — D-26 cancellation and refund policy (owner decision 2026-10-06 item 26; Queue C).
// Written by the reviewer before the work; the implementing agent makes it pass and may not edit it
// (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis, with the
// Moyasar client pointed (MOYASAR_API_BASE) at a local fake gateway that records every refund call,
// so the test sees exactly how much goes back to the card. Keys are generated per run.
//
// Contract
//   GET  /api/v1/refund-policy               public: the policy the terms show before payment
//   GET  /api/v1/admin/refund-policy         admin
//   PUT  /api/v1/admin/refund-policy         admin, validated (percent 0..100, hours/fees >= 0), 400 otherwise
//   {
//     consultation: { full_refund_min_hours: 2, late_refund_percent: 50, patient_no_show_percent: 0,
//                     free_reschedules: 1, free_reschedule_min_hours: 2 },
//     home_visit:   { trip_fee_sar: <admin-set>, patient_absent_percent: 0 },
//     pharmacy:     { refund_delivery_fee_before_dispatch: true }
//   }   (defaults = the owner's table; every value admin-editable)
//   Every appointment, home-care booking and pharmacy order the patient reads carries
//   `cancellation.refund_now: { percent, amount }` (what a cancel right now would refund).
// Rules (refunds go back to the ORIGINAL payment method; never to a wallet unless the patient asks):
//   - Consultation (clinic, video), patient cancels: >= 2 h before the slot 100%, less 50%.
//     The doctor cancels: 100%. One free reschedule up to 2 h before; a second one, or one later than
//     that, is refused (400).
//   - Home nursing, patient cancels: before the provider is on the way (IN_TRANSIT) 100%; after that
//     100% minus the admin trip fee.
//   - Pharmacy delivery, patient cancels: before dispatch 100% including the delivery fee; after dispatch
//     (out_for_delivery) 100% minus the delivery fee.
// Not covered here (no path exists yet; separate queue items): provider no-show and call technical
// failure refunds, patient-chosen wallet refunds.
import * as http from 'http';
import { AddressInfo } from 'net';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const MIN = 60_000;
const HOUR = 60 * MIN;
const GATEWAY_KEY = randomBytes(16).toString('hex');
const refunds: Array<{ payment: string; amount: number }> = [];

describe('D-26: cancellation and refund policy', () => {
  const stack = new LiveStack();
  let gateway: http.Server;
  let patient = '';
  let admin = '';
  let doctor = '';
  const t0 = Date.now();
  // slots on a 15-minute boundary
  const slot = (ms: number) => new Date(Math.ceil((t0 + ms) / (15 * MIN)) * 15 * MIN);

  const appt = (id: string, startMs: number, extra: Record<string, unknown> = {}) => ({
    id, patient_id: 'pat-1', doctor_id: 'doc-prof', doctor_user_id: 'doc-1', service_type: 'video', status: 'CONFIRMED',
    slot_start: slot(startMs), slot_end: new Date(slot(startMs).getTime() + 30 * MIN), duration_minutes: 30,
    total_price: 200, price: 200, payment_method: 'card', payment_status: 'paid', createdAt: new Date(), updatedAt: new Date(), ...extra,
  });
  const paid = (bookingId: string, amount: number, kind: string) => ({
    moyasar_id: `pay_${bookingId}`, booking_id: bookingId, booking_kind: kind, patient_id: 'pat-1', amount, status: 'paid', source_type: 'creditcard', createdAt: new Date(),
  });
  const refundedFor = (bookingId: string) => refunds.filter((r) => r.payment === `pay_${bookingId}`).reduce((s, r) => s + r.amount, 0);
  const waitRefund = async (bookingId: string) => {
    for (let i = 0; i < 40 && refundedFor(bookingId) === 0; i++) await new Promise((r) => setTimeout(r, 250));
    return refundedFor(bookingId);
  };

  beforeAll(async () => {
    gateway = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        const expected = `Basic ${Buffer.from(`${GATEWAY_KEY}:`).toString('base64')}`;
        const m = /\/payments\/([^/]+)\/refunds?$/.exec(String(req.url));
        if (req.headers.authorization !== expected || !m || req.method !== 'POST') { res.writeHead(401); res.end('{}'); return; }
        const amount = Number(JSON.parse(body || '{}').amount || 0) / 100;
        refunds.push({ payment: m[1], amount });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: `rf_${randomBytes(4).toString('hex')}`, status: 'refunded', amount: amount * 100 }));
      });
    });
    await new Promise<void>((r) => gateway.listen(0, '127.0.0.1', () => r()));
    const base = `http://127.0.0.1:${(gateway.address() as AddressInfo).port}/v1`;
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('users').insertOne({ id: 'doc-1', full_name: 'Dr', role: 'doctor', active: true });
      await db.collection('provider_profiles').insertOne({ id: 'doc-prof', user_id: 'doc-1', account_id: 'doc-1', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', consultation_modes: ['clinic', 'video'], name_ar: 'د' });
      await db.collection('appointments').insertMany([
        appt('a-early', 3 * HOUR), appt('a-late', 75 * MIN), appt('a-doc', 75 * MIN), appt('a-view-early', 5 * HOUR), appt('a-view-late', 60 * MIN),
        appt('a-resched', 26 * HOUR), appt('a-resched-late', 75 * MIN), appt('a-clinic', 3 * HOUR, { service_type: 'clinic' }),
      ]);
      await db.collection('moyasar_payments').insertMany(['a-early', 'a-late', 'a-doc', 'a-clinic'].map((id) => paid(id, 200, 'consultation')));
      const nursing = (id: string, state: string) => ({
        id, tracking_id: `HC-${id}`, patient_id: 'pat-1', service_name_ar: 'تمريض', duration: '1h', total: 300, total_price: 300,
        transportation_fee: 0, scheduled_at: new Date(t0 + 4 * HOUR), state, state_history: [], payment_method: 'card', payment_status: 'paid',
        provider_id: 'nurse-1', insurance_status: 'none', createdAt: new Date(), updatedAt: new Date(),
      });
      await db.collection('homecarebookings').insertMany([nursing('n-before', 'CONFIRMED'), nursing('n-transit', 'IN_TRANSIT')]);
      await db.collection('moyasar_payments').insertMany([paid('n-before', 300, 'nursing'), paid('n-transit', 300, 'nursing')]);
      const order = (id: string, status: string) => ({
        id, patient_account_id: 'pat-1', status, payment_method: 'card', payment_status: 'paid', fulfillment: 'delivery',
        items: [{ id: `${id}-i1`, raw_name: 'Panadol', qty: 1 }], timeline: [],
        selected_offer_id: `off-${id}`, selected_offer_version: 1, quote_accepted_at: new Date(),
        totals: { subtotal: 100, delivery_fee: 15, total: 115, currency: 'SAR' },
        pricing_snapshot: { offer_id: `off-${id}`, offer_version: 1, totals: { subtotal: 100, delivery_fee: 15, total: 115, currency: 'SAR' }, hash: 'c'.repeat(64), captured_at: new Date() },
        createdAt: new Date(), updatedAt: new Date(),
      });
      await db.collection('pharmacy_orders').insertMany([order('o-before', 'confirmed'), order('o-dispatched', 'out_for_delivery')]);
      await db.collection('moyasar_payments').insertMany([paid('o-before', 115, 'pharmacy'), paid('o-dispatched', 115, 'pharmacy')]);
    }, { MOYASAR_API_BASE: base, MOYASAR_SECRET_KEY: GATEWAY_KEY });
    patient = await stack.patient('pat-1');
    admin = await stack.admin('adm-1');
    doctor = new JwtService({ secret: JWT_SECRET }).sign({ id: 'doc-1', sub: 'doc-1', role: 'doctor' });
  });
  afterAll(async () => { await stack.stop(); gateway?.close(); });

  describe('the policy', () => {
    it('is public with the owner\'s values by default', async () => {
      const r = await stack.call(0, 'GET', '/api/v1/refund-policy');
      expect(r.status).toBe(200);
      expect(r.body.consultation).toMatchObject({ full_refund_min_hours: 2, late_refund_percent: 50, patient_no_show_percent: 0, free_reschedules: 1, free_reschedule_min_hours: 2 });
      expect(r.body.home_visit).toMatchObject({ patient_absent_percent: 0 });
      expect(r.body.pharmacy).toMatchObject({ refund_delivery_fee_before_dispatch: true });
    });
    it('only an admin edits it, and values are validated', async () => {
      const cur = (await stack.call(0, 'GET', '/api/v1/admin/refund-policy', admin)).body;
      expect(cur?.consultation?.late_refund_percent).toBe(50);
      expect((await stack.call(0, 'PUT', '/api/v1/admin/refund-policy', patient, { ...cur, home_visit: { ...cur.home_visit, trip_fee_sar: 40 } })).status).toBe(403);
      expect((await stack.call(0, 'PUT', '/api/v1/admin/refund-policy', admin, { ...cur, consultation: { ...cur.consultation, late_refund_percent: 150 } })).status).toBe(400);
      expect((await stack.call(0, 'PUT', '/api/v1/admin/refund-policy', admin, { ...cur, home_visit: { ...cur.home_visit, trip_fee_sar: -1 } })).status).toBe(400);
      const ok = await stack.call(0, 'PUT', '/api/v1/admin/refund-policy', admin, { ...cur, home_visit: { ...cur.home_visit, trip_fee_sar: 40 } });
      expect(ok.status).toBeLessThan(300);
      expect((await stack.call(0, 'GET', '/api/v1/refund-policy')).body.home_visit.trip_fee_sar).toBe(40);
    });
  });

  describe('every booking and order says what a cancel would refund now', () => {
    it('appointment 5 h ahead: 100%; 1 h ahead: 50%', async () => {
      const early = await stack.call(0, 'GET', '/api/v1/care/appointments/a-view-early', patient);
      const late = await stack.call(0, 'GET', '/api/v1/care/appointments/a-view-late', patient);
      expect(early.body?.cancellation?.refund_now).toMatchObject({ percent: 100, amount: 200 });
      expect(late.body?.cancellation?.refund_now).toMatchObject({ percent: 50, amount: 100 });
    });
    it('pharmacy order before and after dispatch', async () => {
      const before = await stack.call(0, 'GET', '/api/v1/patient/pharmacy/orders/o-before', patient);
      const after = await stack.call(0, 'GET', '/api/v1/patient/pharmacy/orders/o-dispatched', patient);
      expect(before.body?.cancellation?.refund_now).toMatchObject({ percent: 100, amount: 115 });
      expect(after.body?.cancellation?.refund_now).toMatchObject({ amount: 100 });
    });
  });

  describe('consultations', () => {
    it('patient cancels 3 h before: 100% back to the card', async () => {
      const r = await stack.call(0, 'PATCH', '/api/v1/care/appointments/a-early/cancel', patient, { reason: 'changed my mind' });
      expect(r.status).toBeLessThan(300);
      expect(await waitRefund('a-early')).toBe(200);
    });
    it('clinic visit follows the same rule: 3 h before, 100%', async () => {
      expect((await stack.call(0, 'PATCH', '/api/v1/care/appointments/a-clinic/cancel', patient, { reason: 'x' })).status).toBeLessThan(300);
      expect(await waitRefund('a-clinic')).toBe(200);
    });
    it('patient cancels about 1 h before: 50% back to the card', async () => {
      expect((await stack.call(0, 'PATCH', '/api/v1/care/appointments/a-late/cancel', patient, { reason: 'late' })).status).toBeLessThan(300);
      expect(await waitRefund('a-late')).toBe(100);
    });
    it('the doctor cancels: 100%', async () => {
      expect((await stack.call(0, 'PATCH', '/api/v1/care/appointments/a-doc/cancel', doctor, { reason: 'emergency' })).status).toBeLessThan(300);
      expect(await waitRefund('a-doc')).toBe(200);
    });
    it('no refund ever goes to a wallet', async () => {
      expect(await stack.db.collection('wallet_transactions').countDocuments({ ownerId: 'pat-1' })).toBe(0);
      expect(await stack.db.collection('wallet_transactions').countDocuments({ owner_id: 'pat-1' })).toBe(0);
    });
    it('one free reschedule up to 2 h before; a second one is refused', async () => {
      const first = await stack.call(0, 'PATCH', '/api/v1/care/appointments/a-resched/reschedule', patient, { slot_start: slot(30 * HOUR).toISOString() });
      expect(first.status).toBeLessThan(300);
      const moved = await stack.db.collection('appointments').findOne({ status: { $in: ['CONFIRMED', 'PENDING'] }, patient_id: 'pat-1', slot_start: slot(30 * HOUR) });
      expect(moved).toBeTruthy();
      const second = await stack.call(0, 'PATCH', `/api/v1/care/appointments/${moved!.id}/reschedule`, patient, { slot_start: slot(34 * HOUR).toISOString() });
      expect(second.status).toBe(400);
    });
    it('a reschedule less than 2 h before is refused', async () => {
      const r = await stack.call(0, 'PATCH', '/api/v1/care/appointments/a-resched-late/reschedule', patient, { slot_start: slot(48 * HOUR).toISOString() });
      expect(r.status).toBe(400);
    });
  });

  describe('home nursing', () => {
    it('cancel before the nurse is on the way: 100%', async () => {
      expect((await stack.call(0, 'POST', '/api/v1/nursing/bookings/n-before/cancel', patient, {})).status).toBeLessThan(300);
      expect(await waitRefund('n-before')).toBe(300);
    });
    it('cancel after the nurse is on the way: 100% minus the admin trip fee (40)', async () => {
      expect((await stack.call(0, 'POST', '/api/v1/nursing/bookings/n-transit/cancel', patient, {})).status).toBeLessThan(300);
      expect(await waitRefund('n-transit')).toBe(260);
    });
  });

  describe('pharmacy delivery', () => {
    it('cancel before dispatch: 100% including the delivery fee', async () => {
      expect((await stack.call(0, 'POST', '/api/v1/patient/pharmacy/orders/o-before/cancel', patient, { reason: 'no longer needed' })).status).toBeLessThan(300);
      expect(await waitRefund('o-before')).toBe(115);
    });
    it('cancel after dispatch: 100% minus the delivery fee', async () => {
      expect((await stack.call(0, 'POST', '/api/v1/patient/pharmacy/orders/o-dispatched/cancel', patient, { reason: 'too late' })).status).toBeLessThan(300);
      expect(await waitRefund('o-dispatched')).toBe(100);
    });
  });
});
