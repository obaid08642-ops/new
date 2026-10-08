// ACCEPTANCE — S-7 cross-user proof (owner decision 2026-10-06 item 28, security sweep; Queue C D-28).
// Written by the reviewer before the work; the implementing agent makes it pass and may not edit it
// (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
//
// For every patient-owned record type: patient A owns a record (created through the real route, or
// stored directly where creating it needs a provider's action). A can read it (control: proves the
// record is real). Patient B then tries to read, update and delete it by its id. Required:
//   - every one of B's attempts answers 403 or 404 (a 200 that quietly does nothing is not enough:
//     the owner's rule is "every attempt answers 403 or 404");
//   - A's record is unchanged afterwards.
// The table of attempts and answers is written to the test output (for the PR).
import { LiveStack } from './live-server';

jest.setTimeout(900_000);

type Attempt = [method: string, path: string, body?: unknown];
type Kind = {
  name: string;
  /** returns the record id; may use A's token through the real route, or seed Mongo */
  create: () => Promise<string>;
  /** A's own read (control); must answer 200 */
  read?: (id: string) => string;
  /** B's attempts */
  attempts: (id: string) => Attempt[];
  /** A's record as stored, to compare before and after */
  snapshot: (id: string) => Promise<unknown>;
};

const A = 'pat-a';
const B = 'pat-b';
const now = () => new Date();

describe('S-7: another patient can never read, change or delete my records', () => {
  const stack = new LiveStack();
  let a = '';
  let b = '';
  const table: string[] = [];
  const one = (coll: string, q: Record<string, unknown>) => async () => {
    const d = await stack.db.collection(coll).findOne(q);
    if (!d) return null;
    const { updatedAt, ...rest } = d as any; // updatedAt alone may move on a no-op save; content may not
    void updatedAt;
    return JSON.parse(JSON.stringify(rest));
  };
  const viaRoute = async (path: string, body: unknown, pick: (b: any) => string) => {
    const r = await stack.call(0, 'POST', path, a, body);
    expect([path, r.status]).toEqual([path, expect.any(Number)]);
    if (r.status >= 300) throw new Error(`A could not create through ${path}: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
    const id = pick(r.body?.data ?? r.body);
    if (!id) throw new Error(`no id in the answer of ${path}: ${JSON.stringify(r.body).slice(0, 300)}`);
    return String(id);
  };
  const seed = (coll: string, doc: Record<string, unknown>) => async () => {
    await stack.db.collection(coll).insertOne({ createdAt: now(), updatedAt: now(), ...doc });
    return String(doc.id);
  };

  const KINDS: Kind[] = [
    {
      name: 'address',
      create: () => viaRoute('/api/v1/users/me/addresses', { label: 'home', street: 'Olaya', city: 'Riyadh', lat: 24.7, lng: 46.7 },
        (r) => (Array.isArray(r) ? r : r?.addresses ?? [r]).map((x: any) => x?.id ?? x?.addressId ?? x?._id).filter(Boolean).pop()),
      attempts: (id) => [['PATCH', `/api/v1/users/me/addresses/${id}`, { label: 'stolen' }], ['DELETE', `/api/v1/users/me/addresses/${id}`]],
      snapshot: async () => (await one('patient_profiles', { user_id: A })())?.addresses ?? (await one('patientprofiles', { user_id: A })())?.addresses ?? null,
    },
    {
      name: 'vital reading',
      create: () => viaRoute('/api/v1/health/vitals', { type: 'heart_rate', value: 72 }, (r) => r?.id),
      attempts: (id) => [['PATCH', `/api/v1/health/vitals/${id}`, { type: 'heart_rate', value: 10 }], ['DELETE', `/api/v1/health/vitals/${id}`]],
      snapshot: async (id) => (await stack.db.collection('vitalreadings').findOne({ id })) ? one('vitalreadings', { id })() : one('vitals', { id })(),
    },
    {
      name: 'medication reminder',
      create: () => viaRoute('/api/v1/health/reminders', { medicine_name_ar: 'ميتفورمين', medicine_name_en: 'Metformin', dose: '500mg', times: ['08:00'], time_zone: 'Asia/Riyadh', frequency: 'daily', dosage_count: 1, duration_days: 30, pills_remaining: 30, start_date: new Date().toISOString() }, (r) => r?.id),
      attempts: (id) => [['POST', `/api/v1/health/reminders/${id}/log`, { status: 'taken', time_key: '08:00' }], ['POST', `/api/v1/health/reminders/${id}/refill/cancel`, {}]],
      snapshot: async (id) => one('medicationreminders', { id })(),
    },
    {
      name: 'allergy (medical profile)',
      create: () => viaRoute('/api/v1/medical-profile/allergies', { name: 'Penicillin' }, (r) => (r?.allergies ?? []).map((x: any) => x.id).pop()),
      attempts: (id) => [['DELETE', `/api/v1/medical-profile/allergies/${id}`]],
      snapshot: async () => (await one('medicalprofiles', { patient_id: A })())?.allergies ?? null,
    },
    {
      name: 'support request',
      create: () => viaRoute('/api/v1/support/requests', { subject: 'Help', message: 'private message' }, (r) => r?.id),
      read: (id) => `/api/v1/support/requests/${id}`,
      attempts: (id) => [['GET', `/api/v1/support/requests/${id}`], ['POST', `/api/v1/support/requests/${id}/reply`, { message: 'hijack' }]],
      snapshot: async (id) => one('supportrequests', { id })(),
    },
    {
      name: 'prescription',
      create: seed('prescriptions', { id: 'rx-a', patient_id: A, status: 'active', source: 'upload', items: [{ name: 'Amoxicillin' }] }),
      read: (id) => `/api/v1/prescriptions/${id}`,
      attempts: (id) => [['GET', `/api/v1/prescriptions/${id}`], ['POST', `/api/v1/prescriptions/${id}/transition`, { to: 'cancelled' }]],
      snapshot: (id) => one('prescriptions', { id })(),
    },
    {
      name: 'consultation appointment',
      create: seed('appointments', { id: 'ap-a', patient_id: A, doctor_id: 'doc-1', status: 'CONFIRMED', service_type: 'clinic', slot_start: new Date(Date.now() + 3 * 86_400_000), slot_end: new Date(Date.now() + 3 * 86_400_000 + 1_800_000), duration_minutes: 30, price: 200 }),
      read: (id) => `/api/v1/care/appointments/${id}`,
      attempts: (id) => [['GET', `/api/v1/care/appointments/${id}`], ['PATCH', `/api/v1/care/appointments/${id}/cancel`, {}], ['PATCH', `/api/v1/care/appointments/${id}/reschedule`, { slot_start: new Date(Date.now() + 4 * 86_400_000).toISOString() }]],
      snapshot: (id) => one('appointments', { id })(),
    },
    {
      name: 'lab booking',
      create: seed('labbookings', { id: 'lb-a', tracking_id: 'LB-A', patient_id: A, state: 'CONFIRMED', items: [{ service_id: 'cbc', name_ar: 'cbc', name_en: 'CBC', price: 80 }], total: 80, scheduled_at: new Date(Date.now() + 86_400_000), state_history: [] }),
      read: (id) => `/api/v1/labs/bookings/${id}`,
      attempts: (id) => [['GET', `/api/v1/labs/bookings/${id}`], ['POST', `/api/v1/labs/bookings/${id}/cancel`, {}]],
      snapshot: (id) => one('labbookings', { id })(),
    },
    {
      name: 'pharmacy order',
      create: seed('pharmacy_orders', { id: 'po-a', patient_account_id: A, status: 'broadcasting', fulfillment: 'delivery', items: [{ id: 'po-a-i1', raw_name: 'Panadol', qty: 1 }], timeline: [] }),
      read: (id) => `/api/v1/patient/pharmacy/orders/${id}`,
      attempts: (id) => [['GET', `/api/v1/patient/pharmacy/orders/${id}`], ['POST', `/api/v1/patient/pharmacy/orders/${id}/cancel`, { reason: 'x' }], ['GET', `/api/v1/orders/${id}/tracking`]],
      snapshot: (id) => one('pharmacy_orders', { id })(),
    },
    {
      name: 'order',
      create: seed('orders', { id: 'or-a', patient_id: A, status: 'pending', items: [{ name: 'Panadol', qty: 1, price: 10 }], total: 10 }),
      read: (id) => `/api/v1/orders/${id}`,
      attempts: (id) => [['GET', `/api/v1/orders/${id}`], ['POST', `/api/v1/orders/${id}/cancel`, {}]],
      snapshot: (id) => one('orders', { id })(),
    },
    {
      name: 'medical report',
      create: seed('medicalreports', { id: 'mr-a', patient_id: A, doctor_id: 'doc-1', title_ar: 'تقرير', report_type: 'clinic_note', diagnosis: 'private', shared_with_doctor_ids: [] }),
      read: (id) => `/api/v1/medical-reports/${id}`,
      attempts: (id) => [['GET', `/api/v1/medical-reports/${id}`], ['POST', `/api/v1/medical-reports/${id}/share`, { doctor_profile_id: 'doc-x' }]],
      snapshot: (id) => one('medicalreports', { id })(),
    },
    {
      name: 'lab result',
      create: seed('labresults', { id: 'lr-a', booking_id: 'lb-a', patient_id: A, service_name_ar: 'cbc', type: 'STRUCTURED', source: 'labs', entries: [{ name: 'HGB', value: '13' }] }),
      read: (id) => `/api/v1/lab-results/${id}`,
      attempts: (id) => [['GET', `/api/v1/lab-results/${id}`]],
      snapshot: (id) => one('labresults', { id })(),
    },
    {
      name: 'notification',
      create: seed('notifications', { id: 'nt-a', user_id: A, title: 'private', body: 'private', read: false }),
      attempts: (id) => [['POST', `/api/v1/notifications/${id}/read`, {}]],
      snapshot: (id) => one('notifications', { id })(),
    },
    {
      name: 'return request',
      create: seed('returnrequests', { id: 'rt-a', patient_id: A, user_id: A, serviceType: 'pharmacy', orderId: 'or-a', reason: 'damaged', status: 'pending' }),
      read: (id) => `/api/v1/pharmacy/returns/${id}`,
      attempts: (id) => [['GET', `/api/v1/pharmacy/returns/${id}`]],
      snapshot: (id) => one('returnrequests', { id })(),
    },
    {
      name: 'payment transaction',
      create: seed('transactions', { id: 'tx-a', booking_kind: 'pharmacy', booking_id: 'po-a', patient_id: A, amount: 50, currency: 'SAR', gateway: 'moyasar', method: 'card', status: 'pending', gateway_intent_id: 'pay_a' }),
      attempts: (id) => [['POST', `/api/v1/payments/verify/${id}`, {}], ['GET', '/api/v1/payments/booking/pharmacy/po-a']],
      snapshot: (id) => one('transactions', { id })(),
    },
  ];

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1);
    a = await stack.patient(A);
    b = await stack.patient(B);
  });
  afterAll(async () => {
    // eslint-disable-next-line no-console
    console.log(['| record | B attempt | answer |', '|---|---|---|', ...table].join('\n'));
    await stack.stop();
  });

  KINDS.forEach((k) => {
    it(`${k.name}: B gets 403/404 on every attempt and A's record is unchanged`, async () => {
      const id = await k.create();
      if (k.read) expect([k.name, (await stack.call(0, 'GET', k.read(id), a)).status]).toEqual([k.name, 200]);
      const before = await k.snapshot(id);
      expect(before).toBeTruthy();
      const bad: string[] = [];
      for (const [method, path, body] of k.attempts(id)) {
        const r = await stack.call(0, method, path, b, body);
        table.push(`| ${k.name} | ${method} ${path} | ${r.status} |`);
        if (r.status !== 403 && r.status !== 404) bad.push(`${method} ${path} -> ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
      }
      const after = await k.snapshot(id);
      expect({ wrong_answers: bad, record_changed: JSON.stringify(after) !== JSON.stringify(before) }).toEqual({ wrong_answers: [], record_changed: false });
    });
  });
});
