// ACCEPTANCE — Ordering model M2: the doctor's structured medical order (docs/product/ORDERING_MODEL_2026-10-16.md phase M2;
// ORDERING_UX_SPEC §2.3). Written by the reviewer before the work; the implementing agent makes it pass and may not edit it
// (nor live-server.ts next to it). Backend part only; "My medical orders", the Home card and the composer (M6) call these routes.
//
// Owner answers (#1700, 2026-10-18):
//   * validity: the doctor picks 30, 90 or 180 days; defaults 30 (labs, radiology) and 90 (nursing, sessions); a warning
//     (`expires_soon`) 3 days before; an expired order cannot be ordered again; "Ask your doctor to renew" sends a request.
//   * medicines LINK to the existing e-prescription (`prescription_id`); they are not copied into the order.
//   * the doctor never picks the provider.
//
// Contract (under /api/v1):
//   POST /doctors/appointments/:id/medical-order   (the doctor of that appointment; a completed or in-progress visit)
//        { labs?: [{ catalog_id }], radiology?: [{ catalog_id }], nursing?: [{ catalog_id, sessions?: n (1..30), interval_days?: n }],
//          prescription_id?: string, valid_days?: 30|90|180, notes?: string }
//        → 201 { id, status: 'active', valid_until, items: [{ id, group, catalog_id, status: 'open', ... }], prescription_id }
//        400 `medical_order_empty` (no item and no prescription), `valid_days_invalid`, `prescription_not_found` (not this doctor's
//        for this patient), `catalog_item_not_found`; 403 a patient or another doctor; 404 unknown appointment.
//        A provider id in the body is refused (400): the doctor never chooses the provider.
//        Items get the per-group default validity when `valid_days` is omitted: 30 for labs/radiology orders, 90 when the
//        order holds only nursing.
//   GET  /medical-orders/mine?active=1   (patient) → the patient's orders with `expires_soon` (≤ 3 days) and `expired`;
//        `active=1` drops expired and fully done orders.
//   GET  /medical-orders/:id             patient (own), the writing doctor; anyone else 404.
//   POST /medical-orders/:id/items/:itemId/order   (patient) → { prefill: { service_kind, medical_order_id, items: [{ item_id, catalog_id }] } }
//        prefills the right flow with the item's group (every still-open item of that group when `group_all: true` is sent);
//        410 `medical_order_expired` on an expired order.
//   POST /medical-orders/:id/items/:itemId/link-booking { booking_id, booking_kind } (patient, own booking) → item `ordered`;
//        a booking of another patient → 403.
//   POST /medical-orders/:id/items/:itemId/defer  (patient) → status `later`, kept open for the order's validity.
//   POST /medical-orders/:id/renew-request        (patient, expired or expiring order) → 201 { requested: true };
//        GET /medical-orders/renew-requests (doctor) → [{ order_id, patient_id, requested_at }].
//   GET  /medical-orders/mine groups items by `group` so the app shows one Order button per group; the e-prescription group
//        carries `prescription_id` and no per-item rows.
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const DOC = 'doc-m2';
const OTHER_DOC = 'doc-m2-other';
const PATIENT = 'pat-m2';
const OTHER_PATIENT = 'pat-m2-other';
const sign = (payload: Record<string, unknown>) => new JwtService({ secret: JWT_SECRET }).sign(payload);
const DAY = 86_400_000;

describe('M2 doctor medical order', () => {
  const stack = new LiveStack();
  let doctor = '';
  let otherDoctor = '';
  let patient = '';
  let otherPatient = '';
  let orderId = '';
  let items: any[] = [];

  const post = (path: string, token: string, body: unknown = {}) => stack.call(0, 'POST', `/api/v1${path}`, token, body);
  const get = (path: string, token: string) => stack.call(0, 'GET', `/api/v1${path}`, token);

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      for (const id of [DOC, OTHER_DOC]) await db.collection('users').insertOne({ id, full_name: `Dr ${id}`, role: 'doctor', active: true });
      await db.collection('lab_services').insertMany([
        { id: 'cbc', code: 'CBC', name_ar: 'صورة دم', price: 40, active: true },
        { id: 'hba1c', code: 'HBA1C', name_ar: 'سكر تراكمي', price: 60, active: true },
      ]);
      await db.collection('radiology_services').insertOne({ id: 'us-abd', name_ar: 'سونار بطن', modality: 'ultrasound', price: 150, active: true });
      await db.collection('nursing_services').insertOne({ id: 'dressing', name_ar: 'تغيير جرح', price: 80, active: true });
      const appt = (id: string, doctorId: string, patientId: string) => ({
        id, patient_id: patientId, doctor_user_id: doctorId, provider_id: doctorId, status: 'completed', service_type: 'consultation', price: 200, total: 200, createdAt: new Date(),
      });
      await db.collection('appointments').insertMany([appt('appt-m2', DOC, PATIENT), appt('appt-m2-b', OTHER_DOC, OTHER_PATIENT)]);
      await db.collection('prescriptions').insertMany([
        { id: 'rx-m2', doctor_id: DOC, doctor_user_id: DOC, patient_id: PATIENT, status: 'active', items: [{ name: 'Amoxicillin 500', qty: 1 }], createdAt: new Date() },
        { id: 'rx-other', doctor_id: OTHER_DOC, doctor_user_id: OTHER_DOC, patient_id: OTHER_PATIENT, status: 'active', items: [{ name: 'Panadol', qty: 1 }], createdAt: new Date() },
      ]);
      await db.collection('lab_bookings').insertMany([
        { id: 'lab-bk-m2', patient_id: PATIENT, patient_account_id: PATIENT, status: 'pending', createdAt: new Date() },
        { id: 'lab-bk-other', patient_id: OTHER_PATIENT, patient_account_id: OTHER_PATIENT, status: 'pending', createdAt: new Date() },
      ]);
    });
    doctor = sign({ id: DOC, sub: DOC, role: 'doctor' });
    otherDoctor = sign({ id: OTHER_DOC, sub: OTHER_DOC, role: 'doctor' });
    patient = await stack.patient(PATIENT);
    otherPatient = await stack.patient(OTHER_PATIENT);
  });
  afterAll(async () => { await stack.stop(); });

  it('1. the doctor writes one order with labs, radiology, nursing sessions and a linked e-prescription', async () => {
    const r = await post('/doctors/appointments/appt-m2/medical-order', doctor, {
      labs: [{ catalog_id: 'cbc' }, { catalog_id: 'hba1c' }], radiology: [{ catalog_id: 'us-abd' }],
      nursing: [{ catalog_id: 'dressing', sessions: 5, interval_days: 2 }], prescription_id: 'rx-m2', notes: 'fasting for HbA1c',
    });
    expect(r.status).toBe(201);
    orderId = r.body.id;
    expect(r.body).toMatchObject({ status: 'active', prescription_id: 'rx-m2' });
    items = r.body.items;
    expect(items.map((i: any) => i.group).sort()).toEqual(['labs', 'labs', 'nursing', 'radiology']);
    expect(items.every((i: any) => i.status === 'open')).toBe(true);
    const nursing = items.find((i: any) => i.group === 'nursing');
    expect(nursing).toMatchObject({ catalog_id: 'dressing', sessions: 5, interval_days: 2 });
    // default validity: 30 days (an order with labs or radiology)
    const days = Math.round((new Date(r.body.valid_until).getTime() - Date.now()) / DAY);
    expect(days).toBeGreaterThanOrEqual(29);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('2. validity is 30, 90 or 180 days (90 by default for nursing-only); anything else is refused', async () => {
    const ninety = await post('/doctors/appointments/appt-m2/medical-order', doctor, { labs: [{ catalog_id: 'cbc' }], valid_days: 90 });
    expect(ninety.status).toBe(201);
    expect(Math.round((new Date(ninety.body.valid_until).getTime() - Date.now()) / DAY)).toBeGreaterThanOrEqual(89);
    const nursingOnly = await post('/doctors/appointments/appt-m2/medical-order', doctor, { nursing: [{ catalog_id: 'dressing', sessions: 3 }] });
    expect(nursingOnly.status).toBe(201);
    expect(Math.round((new Date(nursingOnly.body.valid_until).getTime() - Date.now()) / DAY)).toBeGreaterThanOrEqual(89);
    const bad = await post('/doctors/appointments/appt-m2/medical-order', doctor, { labs: [{ catalog_id: 'cbc' }], valid_days: 45 });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toContain('valid_days_invalid');
  });

  it('3. refusals: empty order, a prescription of another doctor, unknown catalogue item, a chosen provider, wrong caller', async () => {
    const empty = await post('/doctors/appointments/appt-m2/medical-order', doctor, { notes: 'nothing' });
    expect(JSON.stringify(empty.body)).toContain('medical_order_empty');
    expect(empty.status).toBe(400);
    const foreignRx = await post('/doctors/appointments/appt-m2/medical-order', doctor, { prescription_id: 'rx-other' });
    expect(foreignRx.status).toBe(400);
    expect(JSON.stringify(foreignRx.body)).toContain('prescription_not_found');
    const ghost = await post('/doctors/appointments/appt-m2/medical-order', doctor, { labs: [{ catalog_id: 'nope' }] });
    expect(JSON.stringify(ghost.body)).toContain('catalog_item_not_found');
    const chosen = await post('/doctors/appointments/appt-m2/medical-order', doctor, { labs: [{ catalog_id: 'cbc' }], provider_id: 'lab-x' });
    expect(chosen.status).toBe(400);
    expect((await post('/doctors/appointments/appt-m2/medical-order', otherDoctor, { labs: [{ catalog_id: 'cbc' }] })).status).toBeGreaterThanOrEqual(403);
    expect((await post('/doctors/appointments/appt-m2/medical-order', patient, { labs: [{ catalog_id: 'cbc' }] })).status).toBe(403);
    expect((await post('/doctors/appointments/no-such-appt/medical-order', doctor, { labs: [{ catalog_id: 'cbc' }] })).status).toBe(404);
  });

  it('4. "My medical orders": the patient reads their own, grouped, with the e-prescription as one group; others see nothing', async () => {
    const mine = await get('/medical-orders/mine?active=1', patient);
    expect(mine.status).toBe(200);
    const list: any[] = Array.isArray(mine.body) ? mine.body : mine.body.items;
    const order = list.find((o) => o.id === orderId);
    expect(order).toBeTruthy();
    expect(order.expires_soon).toBe(false);
    expect(Object.keys(order.groups).sort()).toEqual(['labs', 'nursing', 'prescription', 'radiology']);
    expect(order.groups.labs.items).toHaveLength(2);
    expect(order.groups.prescription).toMatchObject({ prescription_id: 'rx-m2' });
    expect(order.groups.prescription.items ?? []).toHaveLength(0);
    expect((await get(`/medical-orders/${orderId}`, patient)).status).toBe(200);
    expect((await get(`/medical-orders/${orderId}`, doctor)).status).toBe(200);
    expect((await get(`/medical-orders/${orderId}`, otherPatient)).status).toBe(404);
    expect((await get(`/medical-orders/${orderId}`, otherDoctor)).status).toBe(404);
    const theirs: any[] = (await get('/medical-orders/mine?active=1', otherPatient)).body?.items ?? (await get('/medical-orders/mine?active=1', otherPatient)).body;
    expect(theirs.find((o) => o.id === orderId)).toBeUndefined();
  });

  it('5. the Order button prefills the right flow; later defers; linking a booking marks the item ordered', async () => {
    const cbc = items.find((i: any) => i.catalog_id === 'cbc');
    const one = await post(`/medical-orders/${orderId}/items/${cbc.id}/order`, patient, {});
    expect(one.status).toBe(200);
    expect(one.body.prefill).toMatchObject({ service_kind: 'lab', medical_order_id: orderId });
    expect(one.body.prefill.items.map((i: any) => i.catalog_id)).toEqual(['cbc']);
    const all = await post(`/medical-orders/${orderId}/items/${cbc.id}/order`, patient, { group_all: true });
    expect(all.body.prefill.items.map((i: any) => i.catalog_id).sort()).toEqual(['cbc', 'hba1c']);

    const hba1c = items.find((i: any) => i.catalog_id === 'hba1c');
    expect((await post(`/medical-orders/${orderId}/items/${hba1c.id}/defer`, patient, {})).status).toBeLessThan(300);

    const foreign = await post(`/medical-orders/${orderId}/items/${cbc.id}/link-booking`, patient, { booking_id: 'lab-bk-other', booking_kind: 'lab' });
    expect(foreign.status).toBe(403);
    const link = await post(`/medical-orders/${orderId}/items/${cbc.id}/link-booking`, patient, { booking_id: 'lab-bk-m2', booking_kind: 'lab' });
    expect(link.status).toBeLessThan(300);
    const after = (await get(`/medical-orders/${orderId}`, patient)).body;
    const byId = Object.fromEntries(after.items.map((i: any) => [i.id, i.status]));
    expect(byId[cbc.id]).toBe('ordered');
    expect(byId[hba1c.id]).toBe('later');
    expect(byId[items.find((i: any) => i.group === 'radiology').id]).toBe('open');
    // an ordered item is not offered again
    const again = await post(`/medical-orders/${orderId}/items/${cbc.id}/order`, patient, { group_all: true });
    expect(again.body.prefill.items.map((i: any) => i.catalog_id)).not.toContain('cbc');
  });

  it('6. expiry: a warning 3 days before; an expired order cannot be ordered; the patient asks the doctor to renew', async () => {
    const ins = (id: string, valid_until: Date) => stack.db.collection('medical_orders').insertOne({
      id, patient_id: PATIENT, doctor_id: DOC, appointment_id: 'appt-m2', status: 'active', valid_until, createdAt: new Date(),
      items: [{ id: `${id}-i`, group: 'labs', catalog_id: 'cbc', status: 'open' }],
    });
    await ins('mo-soon', new Date(Date.now() + 2 * DAY));
    await ins('mo-expired', new Date(Date.now() - DAY));
    const all = (await get('/medical-orders/mine', patient)).body;
    const list: any[] = Array.isArray(all) ? all : all.items;
    expect(list.find((o) => o.id === 'mo-soon')).toMatchObject({ expires_soon: true, expired: false });
    expect(list.find((o) => o.id === 'mo-expired')).toMatchObject({ expired: true });
    const active = (await get('/medical-orders/mine?active=1', patient)).body;
    expect((Array.isArray(active) ? active : active.items).find((o: any) => o.id === 'mo-expired')).toBeUndefined();

    const blocked = await post('/medical-orders/mo-expired/items/mo-expired-i/order', patient, {});
    expect(blocked.status).toBe(410);
    expect(JSON.stringify(blocked.body)).toContain('medical_order_expired');

    const renew = await post('/medical-orders/mo-expired/renew-request', patient, {});
    expect(renew.status).toBe(201);
    expect(renew.body.requested).toBe(true);
    const reqs = (await get('/medical-orders/renew-requests', doctor)).body;
    expect((Array.isArray(reqs) ? reqs : reqs.items).find((x: any) => x.order_id === 'mo-expired')).toMatchObject({ patient_id: PATIENT });
    expect((await post('/medical-orders/mo-expired/renew-request', otherPatient, {})).status).toBe(404);
    expect((Array.isArray((await get('/medical-orders/renew-requests', otherDoctor)).body) ? (await get('/medical-orders/renew-requests', otherDoctor)).body : []).find((x: any) => x.order_id === 'mo-expired')).toBeUndefined();
  });

  it('7. the e-prescription is untouched: it stays the single source for the pharmacy', async () => {
    const rx = await stack.db.collection('prescriptions').findOne({ id: 'rx-m2' });
    expect(rx?.items).toHaveLength(1);
    expect(rx?.status).toBe('active');
    const order = await stack.db.collection('medical_orders').findOne({ id: orderId });
    expect(order?.prescription_id).toBe('rx-m2');
    expect(JSON.stringify(order?.items || [])).not.toContain('Amoxicillin');
  });
});
