// ACCEPTANCE — D-30 insurance chosen first (owner decision 30, with decision 35: relay only). Written by the reviewer
// before the work; the implementing agent makes it pass and may not edit it (nor live-server.ts next to it).
//
// Decision 30:
//   1. The patient saves their insurance once in the profile: company, plan class (VIP/A/B/C…) and policy number.
//   2. At the start of every service the patient picks Insurance or Self-pay.
//   3. With Insurance, lists show only providers contracted with that company AND that class. A pharmacy order is
//      broadcast only to in-network pharmacies.
//   4. At checkout the final eligibility is checked; if it is refused, self-pay is offered.
//   5. Every provider records the companies AND classes it accepts.
// Decision 35: Nabd+ never contacts an insurer; the request goes only to the provider contracted for that company and
// class, and the provider decides (already built: /insurance/requests, decide, pay-copay, accept-self-pay).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
//
// Contract (under /api/v1):
//   POST  /users/me/insurance { provider: <company id>, class, policy_number }  `class` is required with a company
//         (400 `insurance_class_required`); GET /users/me/insurance and GET /insurance/my-policy read the same record.
//   PATCH /provider/profile/availability { accepted_insurance: [{ company_id, classes: string[], active }] }
//         every provider type; `classes` is kept (GET returns it). A contract with no class is refused
//         (400 `accepted_insurance_classes_required`).
//   GET   /care/doctors?payment=insurance             signed-in patient: only doctors with an active contract for the
//         patient's company AND class. Anonymous callers pass ?insurance=<company>&insurance_class=<class> instead.
//         Without `payment=insurance` (self-pay) the list is unchanged.
//   POST  /patient/pharmacy/orders/:id/submit         an order with payment_method `insurance` is broadcast only to
//         pharmacies with an active contract for the patient's company and class; a self-pay order to all.
//   POST  /insurance/requests { booking_id, booking_kind }  refused with 409 `insurance_not_accepted_by_provider`
//         when the booking's provider has no active contract for the patient's company and class (the client then
//         offers self-pay); otherwise created and routed to that provider only.
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const BUPA = 'ins-bupa-d30';
const TAWUNIYA = 'ins-tawuniya-d30';
const PATIENT = 'pat-d30';
const ANON_PATIENT = 'pat-d30-self';
const CENTER = { lat: 24.7136, lng: 46.6753 }; // Riyadh

// Doctors: each signs in and records its own contracts through the provider API.
const DOCTORS = [
  { id: 'doc-bupa-a', contracts: [{ company_id: BUPA, classes: ['A', 'VIP'], active: true }] },
  { id: 'doc-bupa-b', contracts: [{ company_id: BUPA, classes: ['B'], active: true }] },
  { id: 'doc-tawuniya', contracts: [{ company_id: TAWUNIYA, classes: ['A'], active: true }] },
  { id: 'doc-bupa-a-off', contracts: [{ company_id: BUPA, classes: ['A'], active: false }] },
  { id: 'doc-cash', contracts: [] as Array<{ company_id: string; classes: string[]; active: boolean }> },
];
// Pharmacies 1 km from the patient, all accepting orders.
const PHARMACIES = [
  { id: 'ph-bupa-a', contracts: [{ company_id: BUPA, classes: ['A'], active: true }] },
  { id: 'ph-bupa-c', contracts: [{ company_id: BUPA, classes: ['C'], active: true }] },
  { id: 'ph-none', contracts: [] as Array<{ company_id: string; classes: string[]; active: boolean }> },
];

const sign = (payload: Record<string, unknown>) => new JwtService({ secret: JWT_SECRET }).sign(payload);
const providerToken = (id: string, type: string) => sign({ id, sub: id, role: 'provider', provider_type: type, scope: 'provider' });

describe('D-30 insurance chosen first', () => {
  const stack = new LiveStack();
  let patient = '';
  let selfPayPatient = '';

  const ids = (body: any): string[] => {
    const rows: any[] = Array.isArray(body) ? body : body?.items || body?.data || body?.doctors || body?.results || [];
    return rows.map((r) => String(r.id ?? r.user_id ?? r.account_id ?? ''));
  };
  const doctorIds = (body: any) => ids(body).filter((id) => id.startsWith('doc-'));

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('insurance_companies').insertMany([
        { id: BUPA, name_ar: 'بوبا', name_en: 'Bupa', active: true, is_active: true },
        { id: TAWUNIYA, name_ar: 'التعاونية', name_en: 'Tawuniya', active: true, is_active: true },
      ]);
      for (const d of DOCTORS) {
        await db.collection('provider_accounts').insertOne({ id: d.id, provider_type: 'doctor', status: 'approved', availability: {} });
        await db.collection('provider_profiles').insertOne({
          id: d.id, user_id: d.id, account_id: d.id, type: 'doctor', provider_type: 'doctor',
          status: 'active', public_eligibility: true, medical_review_status: 'approved',
          name_ar: `طبيب ${d.id}`, name_en: `Doctor ${d.id}`, specialty: 'general', rating: 4.5, price_clinic: 200,
          consultation_modes: ['clinic', 'video'], city: 'riyadh',
        });
      }
      await db.collection('system_configs').insertOne({ key: 'pharmacy_broadcast_stages', value: [{ stage: 1, radius_km: 5, timeout_seconds: 600 }] });
      for (const p of PHARMACIES) {
        await db.collection('provider_accounts').insertOne({ id: p.id, provider_type: 'pharmacy', status: 'approved', availability: {} });
        await db.collection('provider_profiles').insertOne({
          id: p.id, user_id: p.id, account_id: p.id, provider_type: 'pharmacy', type: 'pharmacy', status: 'active',
          name_ar: `صيدلية ${p.id}`, geo: { lat: CENTER.lat + 0.009, lng: CENTER.lng },
        });
        await db.collection('provider_availability').insertOne({ provider_account_id: p.id, status: 'accepting_orders' });
      }
      const order = (id: string, patientId: string, method: string) => ({
        id, patient_account_id: patientId, status: 'draft', payment_method: method, fulfillment: 'delivery',
        delivery_address: { geo: CENTER, city: 'riyadh' },
        items: [{ id: `${id}-i1`, raw_name: 'Vitamin D 1000', qty: 1 }],
        timeline: [{ ts: new Date(), event: 'created' }], totals: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' },
        createdAt: new Date(), updatedAt: new Date(),
      });
      await db.collection('pharmacy_orders').insertMany([order('ord-ins', PATIENT, 'insurance'), order('ord-cash', ANON_PATIENT, 'cash')]);
      // consultations booked with a contracted doctor and with a doctor outside the patient's class
      const appt = (id: string, doctor: string) => ({ id, patient_id: PATIENT, doctor_user_id: doctor, provider_id: doctor, status: 'pending', price: 200, total: 200, service_type: 'consultation', createdAt: new Date() });
      await db.collection('appointments').insertMany([appt('appt-in', 'doc-bupa-a'), appt('appt-out', 'doc-bupa-b')]);
    });
    patient = await stack.patient(PATIENT);
    selfPayPatient = await stack.patient(ANON_PATIENT);
  });
  afterAll(async () => { await stack.stop(); });

  it('1. the patient saves company, class and policy number once; class is required', async () => {
    const noClass = await stack.call(0, 'POST', '/api/v1/users/me/insurance', patient, { provider: BUPA, policy_number: 'POL-1' });
    expect(noClass.status).toBe(400);
    expect(JSON.stringify(noClass.body)).toContain('insurance_class_required');

    const saved = await stack.call(0, 'POST', '/api/v1/users/me/insurance', patient, { provider: BUPA, class: 'A', policy_number: 'POL-1' });
    expect(saved.status).toBeLessThan(300);
    const mine = await stack.call(0, 'GET', '/api/v1/users/me/insurance', patient);
    expect(mine.body).toMatchObject({ provider: BUPA, class: 'A', policy_number: 'POL-1' });
    const policy = await stack.call(0, 'GET', '/api/v1/insurance/my-policy', patient);
    expect(policy.body?.has_policy).toBe(true);
    expect(policy.body?.policy).toMatchObject({ class: 'A' });
  });

  it('2. every provider records companies AND classes; a contract without a class is refused', async () => {
    const bad = await stack.call(0, 'PATCH', '/api/v1/provider/profile/availability', providerToken('doc-cash', 'doctor'), { accepted_insurance: [{ company_id: BUPA, active: true }] });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toContain('accepted_insurance_classes_required');

    for (const p of [...DOCTORS.map((d) => ({ ...d, type: 'doctor' })), ...PHARMACIES.map((p) => ({ ...p, type: 'pharmacy' }))]) {
      if (!p.contracts.length) continue;
      const r = await stack.call(0, 'PATCH', '/api/v1/provider/profile/availability', providerToken(p.id, p.type), { accepted_insurance: p.contracts });
      expect(r.status).toBeLessThan(300);
    }
    const back = await stack.call(0, 'GET', '/api/v1/provider/profile/availability', providerToken('doc-bupa-a', 'doctor'));
    expect(back.status).toBe(200);
    const contract = (back.body?.accepted_insurance || []).find((c: any) => c.company_id === BUPA);
    expect(contract?.classes).toEqual(expect.arrayContaining(['A', 'VIP']));
  });

  it('3. self-pay lists are unchanged: every public doctor shows', async () => {
    const r = await stack.call(0, 'GET', '/api/v1/care/doctors?limit=50', selfPayPatient);
    expect(r.status).toBe(200);
    expect(doctorIds(r.body).sort()).toEqual(DOCTORS.map((d) => d.id).sort());
  });

  it("4. with Insurance, the list shows only doctors contracted for the patient's company AND class", async () => {
    const r = await stack.call(0, 'GET', '/api/v1/care/doctors?payment=insurance&limit=50', patient);
    expect(r.status).toBe(200);
    expect(doctorIds(r.body)).toEqual(['doc-bupa-a']);
  });

  it('5. an anonymous visitor filters by company and class in the query', async () => {
    const a = await stack.call(0, 'GET', `/api/v1/care/doctors?insurance=${BUPA}&insurance_class=B&limit=50`);
    expect(a.status).toBe(200);
    expect(doctorIds(a.body)).toEqual(['doc-bupa-b']);
    const vip = await stack.call(0, 'GET', `/api/v1/care/doctors?insurance=${BUPA}&insurance_class=VIP&limit=50`);
    expect(doctorIds(vip.body)).toEqual(['doc-bupa-a']);
  });

  it('6. an insurance pharmacy order reaches only in-network pharmacies for that class; a self-pay order reaches all', async () => {
    const ins = await stack.call(0, 'POST', '/api/v1/patient/pharmacy/orders/ord-ins/submit', patient, {});
    expect(ins.status).toBeLessThan(300);
    const bcIns = await stack.db.collection('pharmacy_broadcasts').findOne({ order_id: 'ord-ins' });
    expect([...(bcIns?.notified_pharmacies || [])].sort()).toEqual(['ph-bupa-a']);

    const cash = await stack.call(0, 'POST', '/api/v1/patient/pharmacy/orders/ord-cash/submit', selfPayPatient, {});
    expect(cash.status).toBeLessThan(300);
    const bcCash = await stack.db.collection('pharmacy_broadcasts').findOne({ order_id: 'ord-cash' });
    expect([...(bcCash?.notified_pharmacies || [])].sort()).toEqual(PHARMACIES.map((p) => p.id).sort());
  });

  it("7. at checkout a provider outside the patient's company and class is refused (self-pay is offered); a contracted one gets the request", async () => {
    const out = await stack.call(0, 'POST', '/api/v1/insurance/requests', patient, { booking_id: 'appt-out', booking_kind: 'consultation' });
    expect(out.status).toBe(409);
    expect(JSON.stringify(out.body)).toContain('insurance_not_accepted_by_provider');
    expect(await stack.db.collection('insuranceservicerequests').countDocuments({ booking_id: 'appt-out' })).toBe(0);

    const ok = await stack.call(0, 'POST', '/api/v1/insurance/requests', patient, { booking_id: 'appt-in', booking_kind: 'consultation' });
    expect(ok.status).toBeLessThan(300);
    const queue = await stack.call(0, 'GET', '/api/v1/insurance/requests/provider/queue', providerToken('doc-bupa-a', 'doctor'));
    expect(queue.status).toBe(200);
    expect(JSON.stringify(queue.body)).toContain('appt-in');
    const other = await stack.call(0, 'GET', '/api/v1/insurance/requests/provider/queue', providerToken('doc-tawuniya', 'doctor'));
    expect(JSON.stringify(other.body)).not.toContain('appt-in');
  });
});
