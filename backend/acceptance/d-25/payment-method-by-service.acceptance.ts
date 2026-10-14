// ACCEPTANCE — D-25 payment method by service (owner decision 2026-10-06 item 25; Queue C).
// Written by the reviewer before the work; the implementing agent makes it pass and may not edit it
// (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
//
// Required behaviour
//   1. No cash for online consultations, home doctor visits and home nursing, on EVERY booking path:
//      POST /care/appointments, POST /unified-bookings, POST
//      /nursing/bookings and the compat POST /home-care/bookings. The refusal is a 400 whose body names
//      the payment method (e.g. "payment_method_cash_not_allowed_..."), and nothing is stored.
//      Clinic visits still accept cash (pay at the clinic) and card.
//   2. Pharmacy cash on delivery (POST /patient/pharmacy/orders/:id/cod/register) only when ALL hold:
//        - no prescription item (an attached prescription, a prescription_id, or a catalogue Rx line);
//        - no insurance;
//        - the order total is under the admin cap;
//        - the patient has at least one completed (delivered/completed) pharmacy order;
//        - the selected pharmacy has not switched cash off for itself.
//      Otherwise 400 with a code that contains "cod".
//   3. Settings: PUT /api/v1/admin/payment-rules { pharmacy_cod_max_sar } (admin only; > 0, else 400);
//      GET /api/v1/payment-rules (public) returns it. PUT /api/v1/provider/pharmacy/cod { enabled }
//      (the pharmacy itself) switches its own cash on delivery.
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const MIN = 60_000;
const HOUR = 60 * MIN;

describe('D-25: payment method by service', () => {
  const stack = new LiveStack();
  let patient = '';      // has a completed pharmacy order
  let newcomer = '';     // has none
  let admin = '';
  let pharmacyA = '';
  const t0 = Date.now();
  const slot = (ms: number) => new Date(Math.ceil((t0 + ms) / (15 * MIN)) * 15 * MIN).toISOString();
  const mentionsPayment = (body: unknown) => /payment|cash/i.test(JSON.stringify(body));

  const pharmacyOrder = (id: string, owner: string, pharmacy: string, extra: Record<string, unknown> = {}) => ({
    id, patient_account_id: owner, status: 'cash_card_payment_pending', payment_method: 'card', fulfillment: 'delivery',
    items: [{ id: `${id}-i1`, raw_name: 'Panadol 500', medicine_id: 'med-otc', matched_sku: '3001', qty: 1 }], timeline: [], prescription_attachments: [],
    selected_offer_id: `off-${id}`, selected_offer_version: 1, selected_allocation_id: `al-${id}`, quote_accepted_at: new Date(),
    totals: { subtotal: 65, delivery_fee: 15, total: 80, currency: 'SAR' },
    pricing_snapshot: { offer_id: `off-${id}`, offer_version: 1, totals: { subtotal: 65, delivery_fee: 15, total: 80, currency: 'SAR' }, hash: 'd'.repeat(64), captured_at: new Date() },
    pharmacy_account_id: pharmacy, createdAt: new Date(), updatedAt: new Date(), ...extra,
  });

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('provider_profiles').insertOne({ id: 'doc-prof', user_id: 'doc-1', account_id: 'doc-1', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', consultation_modes: ['clinic', 'video', 'home'], name_ar: 'د', working_hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '00:00', close: '00:00' })) });
      await db.collection('nursing_services').insertOne({ id: 'svc-1', key: 'svc-1', name_ar: 'تمريض منزلي', price: 300, duration: 'hour', active: true, public_eligibility: true, medical_review_status: 'approved' });
      await db.collection('provider_profiles').insertOne({ id: 'nurse-prof', account_id: 'nurse-1', user_id: 'nurse-1', type: 'home_care', status: 'active', public_eligibility: true, medical_review_status: 'approved', nursing_services: [{ key: 'svc-1' }] });
      await db.collection('medicines').insertMany([
        { id: 'med-otc', sku: 3001, name_ar: 'بنادول', name_en: 'Panadol 500', requires_prescription: false, controlled: false, price: 12, public_eligibility: true, medical_review_status: 'approved' },
        { id: 'med-rx', sku: 3002, name_ar: 'أوجمنتين', name_en: 'Augmentin 1g', requires_prescription: true, controlled: false, price: 80, public_eligibility: true, medical_review_status: 'approved' },
      ]);
      await db.collection('provider_accounts').insertMany([
        { id: 'ph-a', provider_type: 'pharmacy', status: 'approved', email: 'a@ph.test' },
        { id: 'ph-b', provider_type: 'pharmacy', status: 'approved', email: 'b@ph.test' },
      ]);
      const orders: any[] = [
        pharmacyOrder('o-ok', 'pat-1', 'ph-b'),
        pharmacyOrder('o-rx', 'pat-1', 'ph-b', { items: [{ id: 'o-rx-i1', raw_name: 'Augmentin 1g', medicine_id: 'med-rx', matched_sku: '3002', qty: 1 }], prescription_attachments: [{ type: 'image', uri: 'https://files.example/rx.jpg' }] }),
        pharmacyOrder('o-big', 'pat-1', 'ph-b', { totals: { subtotal: 285, delivery_fee: 15, total: 300, currency: 'SAR' }, pricing_snapshot: { offer_id: 'off-o-big', offer_version: 1, totals: { subtotal: 285, delivery_fee: 15, total: 300, currency: 'SAR' }, hash: 'e'.repeat(64), captured_at: new Date() } }),
        pharmacyOrder('o-new', 'pat-new', 'ph-b'),
        pharmacyOrder('o-off', 'pat-1', 'ph-a'),
        pharmacyOrder('o-ins', 'pat-1', 'ph-b', { payment_method: 'insurance', coverage_mode: 'insurance' }),
        { id: 'o-done', patient_account_id: 'pat-1', status: 'completed', payment_method: 'card', items: [], timeline: [], createdAt: new Date(Date.now() - 30 * 24 * HOUR) },
      ];
      await db.collection('pharmacy_orders').insertMany(orders);
      for (const o of orders.filter((x) => x.selected_offer_id)) {
        await db.collection('pharmacy_offers').insertOne({ id: o.selected_offer_id, order_id: o.id, pharmacy_account_id: o.pharmacy_account_id, patient_account_id: o.patient_account_id, status: 'selected', version: 1, items: [], totals: o.totals, quote_expires_at: new Date(Date.now() + HOUR) });
        await db.collection('pharmacy_allocations').insertOne({ id: o.selected_allocation_id, order_id: o.id, pharmacy_account_id: o.pharmacy_account_id, offer_id: o.selected_offer_id, offer_version: 1, status: 'pending_review', items: [] });
      }
    });
    patient = await stack.patient('pat-1');
    newcomer = await stack.patient('pat-new');
    admin = await stack.admin('adm-1');
    pharmacyA = new JwtService({ secret: JWT_SECRET }).sign({ id: 'ph-a', sub: 'ph-a', role: 'provider', provider_type: 'pharmacy', scope: 'provider' });
  });
  afterAll(async () => { await stack.stop(); });

  describe('no cash for online consultations, home doctor visits and home nursing', () => {
    it.each([
      ['POST /care/appointments video', '/api/v1/care/appointments', { doctor_id: 'doc-prof', service_type: 'video', slot_start: '', payment_method: 'cash' }],
      ['POST /care/appointments home', '/api/v1/care/appointments', { doctor_id: 'doc-prof', service_type: 'home', slot_start: '', payment_method: 'cash', visit_location: { lat: 21.5, lng: 39.1, address: 'Jeddah' } }],
      ['POST /unified-bookings video', '/api/v1/unified-bookings', { doctor_id: 'doc-prof', type: 'video', slot_id: '', payment_method_id: 'cash' }],
      ['POST /unified-bookings home', '/api/v1/unified-bookings', { doctor_id: 'doc-prof', type: 'home', slot_id: '', payment_method_id: 'cash', visit_location: { lat: 21.5, lng: 39.1, address: 'Jeddah' } }],
      ['POST /nursing/bookings', '/api/v1/nursing/bookings', { service_id: 'svc-1', provider_id: 'nurse-1', scheduled_at: '', payment_method: 'cash' }],
      ['compat POST /home-care/bookings', '/api/v1/home-care/bookings', { service_id: 'svc-1', provider_id: 'nurse-1', scheduled_at: '', payment_method: 'cash', address: { lat: 21.5, lng: 39.1, address: 'Jeddah' } }],
    ])('%s with cash -> 400 naming the payment method, nothing stored', async (_l, url, raw) => {
      const body: any = { ...raw };
      for (const k of ['slot_start', 'slot_id', 'scheduled_at']) if (k in body) body[k] = slot(26 * HOUR);
      const before = { a: await stack.db.collection('appointments').countDocuments({}), d: await stack.db.collection('doctor_appointments').countDocuments({}), h: await stack.db.collection('homecarebookings').countDocuments({}) };
      const r = await stack.call(0, 'POST', url as string, patient, body);
      expect([r.status, mentionsPayment(r.body)]).toEqual([400, true]);
      expect({ a: await stack.db.collection('appointments').countDocuments({}), d: await stack.db.collection('doctor_appointments').countDocuments({}), h: await stack.db.collection('homecarebookings').countDocuments({}) }).toEqual(before);
    });

    it('control: a clinic visit may still be paid in cash (not refused for the payment method)', async () => {
      const r = await stack.call(0, 'POST', '/api/v1/care/appointments', patient, { doctor_id: 'doc-prof', service_type: 'clinic', slot_start: slot(27 * HOUR), payment_method: 'cash' });
      expect(r.status < 300 || !mentionsPayment(r.body)).toBe(true);
    });
  });

  describe('pharmacy cash on delivery only under all conditions', () => {
    const cod = (token: string, id: string) => stack.call(0, 'POST', `/api/v1/patient/pharmacy/orders/${id}/cod/register`, token, {});
    const refusedCod = (r: { status: number; body: unknown }) => r.status === 400 && /cod/i.test(JSON.stringify(r.body));

    const settings: Record<string, number> = {};
    beforeAll(async () => {
      settings.patientPut = (await stack.call(0, 'PUT', '/api/v1/admin/payment-rules', patient, { pharmacy_cod_max_sar: 200 })).status;
      settings.badPut = (await stack.call(0, 'PUT', '/api/v1/admin/payment-rules', admin, { pharmacy_cod_max_sar: -5 })).status;
      settings.adminPut = (await stack.call(0, 'PUT', '/api/v1/admin/payment-rules', admin, { pharmacy_cod_max_sar: 200 })).status;
      settings.pharmacyOff = (await stack.call(0, 'PUT', '/api/v1/provider/pharmacy/cod', pharmacyA, { enabled: false })).status;
    });

    it('only an admin sets the cap, validated; the pharmacy switches its own cash off', () => {
      expect(settings).toEqual({ patientPut: 403, badPut: 400, adminPut: expect.any(Number), pharmacyOff: expect.any(Number) });
      expect(settings.adminPut).toBeLessThan(300);
      expect(settings.pharmacyOff).toBeLessThan(300);
    });

    it('the cap is public', async () => {
      expect((await stack.call(0, 'GET', '/api/v1/payment-rules')).body?.pharmacy_cod_max_sar).toBe(200);
    });
    it('control: a returning patient, no Rx, no insurance, under the cap, pharmacy allows cash -> accepted', async () => {
      expect((await cod(patient, 'o-ok')).status).toBeLessThan(300);
    });
    it('an order with a prescription item -> refused', async () => {
      expect(refusedCod(await cod(patient, 'o-rx'))).toBe(true);
    });
    it('an insured order -> refused', async () => {
      expect((await cod(patient, 'o-ins')).status).toBe(400);
    });
    it('over the admin cap -> refused', async () => {
      expect(refusedCod(await cod(patient, 'o-big'))).toBe(true);
    });
    it('a first-time patient (no completed order) -> refused', async () => {
      expect(refusedCod(await cod(newcomer, 'o-new'))).toBe(true);
    });
    it('the pharmacy switched cash off for itself -> refused', async () => {
      expect(refusedCod(await cod(patient, 'o-off'))).toBe(true);
    });
    it('a refused order is unchanged', async () => {
      const o = await stack.db.collection('pharmacy_orders').findOne({ id: 'o-big' });
      expect(o?.payment_method).toBe('card');
      expect(o?.cod_registered_at).toBeUndefined();
    });
  });
});
