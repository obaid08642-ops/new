// ACCEPTANCE — Ordering model M5: insurance per item (docs/product/ORDERING_MODEL_2026-10-16.md phase M5; ORDERING_UX_SPEC
// §1 principle 5, §2.1 step 6, §4 risks). Written by the reviewer before the work; the implementing agent makes it pass and
// may not edit it (nor live-server.ts next to it). Backend part only. Builds on D-30 (company + class), D-37 (the relay inbox:
// Nabd+ never contacts an insurer; the contracted provider decides) and M3 (ordering bookings).
//
// Contract (under /api/v1):
//   PUT  /family/members/:memberId/insurance { provider, class, policy_number } (patient, own member; `class` required, as D-30) —
//        a family member carries their own saved insurance; `POST /ordering/quote` with `context.family_member_id` uses it.
//   Booking with payer `insurance` (M3): each booking item carries `coverage` ('covered'|'needs_approval'|'not_covered') and the booking says
//        `estimate: true` until a provider decision exists. The patient share is an estimate until approval; the approved share is final.
//   POST /provider/ordering/bookings/:id/item-decisions (the booking's provider) { decisions: [{ catalog_id, decision: 'approved'|'rejected', patient_share? }],
//        home_fee_approved?: boolean, valid_until?: ISO date }
//     → all approved: approval `approved`, a home booking becomes dispatchable (`pending`); some rejected: approval `partial`, booking
//       `awaiting_patient_choice`; all rejected: approval `rejected`, `awaiting_patient_choice`. 403 another provider, 404 unknown booking.
//     Packages and the home fee are cash unless approved: `home_fee_approved` is false by default and the home fee stays in the patient share.
//   GET  /ordering/bookings/:id/approval (the patient) → { status: 'pending'|'approved'|'partial'|'rejected', items: [{ catalog_id, decision, insurer_share, patient_share }],
//        final: boolean, patient_share_total, home_fee: { amount, covered }, valid_until, warning?: 'approval_expires_before_visit', choices?: [...] }
//        the warning appears when `valid_until` is before the visit start, with `rebook_earlier: true`.
//   POST /ordering/bookings/:id/partial-choice (the patient) { choice: 'pay_difference'|'covered_only'|'cancel_free' }
//        pay_difference → every item stays, the rejected items are paid in cash; covered_only → the rejected items are dropped and the total is recomputed;
//        cancel_free → the booking is cancelled with a full refund of anything paid and no cancellation fee. Only while `awaiting_patient_choice`;
//        409 `choice_not_pending` otherwise; the patient never pays the insured part twice (amounts below).
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const BUPA = 'ins-bupa-m5';
const PATIENT = 'pat-m5';
const MEMBER = 'fam-m5';
const LAB = 'lab-m5';
const OTHER_LAB = 'lab-m5-other';
const CENTER = { lat: 24.7136, lng: 46.6753 };
const sign = (payload: Record<string, unknown>) => new JwtService({ secret: JWT_SECRET }).sign(payload);
const providerToken = (id: string) => sign({ id, sub: id, role: 'provider', provider_type: 'lab', scope: 'provider' });
const DAY = 86_400_000;

describe('M5 insurance per item', () => {
  const stack = new LiveStack();
  let patient = '';
  const lab = providerToken(LAB);

  const post = (path: string, token: string, body: unknown = {}) => stack.call(0, 'POST', `/api/v1${path}`, token, body);
  const get = (path: string, token: string) => stack.call(0, 'GET', `/api/v1${path}`, token);
  const put = (path: string, token: string, body: unknown) => stack.call(0, 'PUT', `/api/v1${path}`, token, body);

  /** A signed-in patient books two insured items at home with the lab, with a doctor's order. */
  const bookInsured = async (): Promise<string> => {
    const q = await post('/ordering/quote', patient, { service_kind: 'lab', items: ['cbc', 'hba1c'], context: { mode: 'home', ...CENTER, payer: 'insurance' } });
    const b = await post('/ordering/bookings', patient, {
      quote_id: q.body.quote_id, selections: { home: { provider_id: LAB, window: { asap: true } } }, payment_method: 'insurance', medical_order_id: 'mo-m5',
    });
    expect(b.status).toBe(201);
    return b.body.bookings[0].id;
  };

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('insurance_companies').insertOne({ id: BUPA, name_ar: 'بوبا', name_en: 'Bupa', active: true, is_active: true });
      await db.collection('lab_services').insertMany([
        { id: 'cbc', code: 'CBC', name_ar: 'صورة دم', price: 50, active: true },
        { id: 'hba1c', code: 'HBA1C', name_ar: 'سكر تراكمي', price: 70, active: true },
      ]);
      for (const id of [LAB, OTHER_LAB]) {
        await db.collection('provider_accounts').insertOne({ id, provider_type: 'lab', status: 'approved', availability: {} });
        await db.collection('provider_profiles').insertOne({
          id, user_id: id, account_id: id, provider_type: 'lab', type: 'lab', status: 'active', public_eligibility: true,
          name_ar: `مختبر ${id}`, geo: { lat: CENTER.lat + 0.01, lng: CENTER.lng }, rating: 4.5, medical_license_number: `LIC-${id}`,
        });
      }
      await db.collection('users').insertOne({ id: PATIENT, full_name: 'Test Patient', role: 'patient', active: true });
      await db.collection('family_members').insertOne({ id: MEMBER, owner_id: PATIENT, user_id: PATIENT, name: 'Child', relation: 'child', createdAt: new Date() });
      await db.collection('medical_orders').insertOne({
        id: 'mo-m5', patient_id: PATIENT, doctor_id: 'doc-x', status: 'active', valid_until: new Date(Date.now() + 20 * DAY), createdAt: new Date(),
        items: [{ id: 'mo-m5-1', group: 'labs', catalog_id: 'cbc', status: 'open' }, { id: 'mo-m5-2', group: 'labs', catalog_id: 'hba1c', status: 'open' }],
      });
    });
    patient = await stack.patient(PATIENT);
    await post('/users/me/insurance', patient, { provider: BUPA, class: 'A', policy_number: 'P-5' });
    await put('/provider/ordering/settings', lab, { modes: ['home', 'facility'], home_fee: 30, home_radius_km: 15, accepted_insurance: [{ company_id: BUPA, classes: ['A'], active: true }] });
    await put('/provider/ordering/items', lab, { service_kind: 'lab', catalog_id: 'cbc', prices: { home: 60, facility: 50 } });
    await put('/provider/ordering/items', lab, { service_kind: 'lab', catalog_id: 'hba1c', prices: { home: 90, facility: 70 } });
  });
  afterAll(async () => { await stack.stop(); });

  it('1. a family member carries their own insurance; the class is required', async () => {
    const noClass = await put(`/family/members/${MEMBER}/insurance`, patient, { provider: BUPA, policy_number: 'C-1' });
    expect(noClass.status).toBe(400);
    expect(JSON.stringify(noClass.body)).toContain('insurance_class_required');
    expect((await put(`/family/members/${MEMBER}/insurance`, patient, { provider: BUPA, class: 'A', policy_number: 'C-1' })).status).toBeLessThan(300);
    const q = await post('/ordering/quote', patient, { service_kind: 'lab', items: ['cbc'], context: { mode: 'home', ...CENTER, payer: 'insurance', family_member_id: MEMBER } });
    expect(q.status).toBe(200);
    expect(q.body.compare.find((c: any) => c.provider_id === LAB)?.in_network).toBe(true);
    // a member of someone else's family is refused
    const other = await stack.patient('pat-m5-stranger');
    expect((await put(`/family/members/${MEMBER}/insurance`, other, { provider: BUPA, class: 'A', policy_number: 'X' })).status).toBeGreaterThanOrEqual(403);
  });

  it('2. an insured booking is an estimate with a per-item coverage; the home booking waits (not dispatched)', async () => {
    const id = await bookInsured();
    const a = await get(`/ordering/bookings/${id}/approval`, patient);
    expect(a.status).toBe(200);
    expect(a.body).toMatchObject({ status: 'pending', final: false });
    expect(a.body.items.map((i: any) => i.catalog_id).sort()).toEqual(['cbc', 'hba1c']);
    expect(a.body.home_fee).toMatchObject({ amount: 30, covered: false });
  });

  it('3. all approved: the final share is set, the home fee stays cash unless approved, the booking is dispatchable', async () => {
    const id = await bookInsured();
    const d = await post(`/provider/ordering/bookings/${id}/item-decisions`, lab, {
      decisions: [{ catalog_id: 'cbc', decision: 'approved', patient_share: 10 }, { catalog_id: 'hba1c', decision: 'approved', patient_share: 14 }],
      valid_until: new Date(Date.now() + 10 * DAY).toISOString(),
    });
    expect(d.status).toBeLessThan(300);
    const a = (await get(`/ordering/bookings/${id}/approval`, patient)).body;
    expect(a).toMatchObject({ status: 'approved', final: true });
    expect(a.items.map((i: any) => i.patient_share).sort((x: number, y: number) => x - y)).toEqual([10, 14]);
    expect(a.patient_share_total).toBe(24 + 30); // item shares + the home fee (not approved: cash)
    expect(a.warning).toBeUndefined();
    const b = (await get(`/labs/bookings/${id}`, patient)).body;
    expect(b.status ?? b.state).not.toBe('awaiting_approval');
    // approved home fee
    const id2 = await bookInsured();
    await post(`/provider/ordering/bookings/${id2}/item-decisions`, lab, {
      decisions: [{ catalog_id: 'cbc', decision: 'approved', patient_share: 10 }, { catalog_id: 'hba1c', decision: 'approved', patient_share: 14 }], home_fee_approved: true,
      valid_until: new Date(Date.now() + 10 * DAY).toISOString(),
    });
    expect((await get(`/ordering/bookings/${id2}/approval`, patient)).body.patient_share_total).toBe(24);
  });

  it('4. only the booking\'s provider decides; a patient cannot', async () => {
    const id = await bookInsured();
    const body = { decisions: [{ catalog_id: 'cbc', decision: 'approved', patient_share: 0 }] };
    expect((await post(`/provider/ordering/bookings/${id}/item-decisions`, providerToken(OTHER_LAB), body)).status).toBeGreaterThanOrEqual(403);
    expect((await post(`/provider/ordering/bookings/${id}/item-decisions`, patient, body)).status).toBe(403);
    expect((await post('/provider/ordering/bookings/no-such/item-decisions', lab, body)).status).toBe(404);
  });

  it('5. partial approval waits for the patient\'s choice; "pay the difference" keeps every item', async () => {
    const id = await bookInsured();
    await post(`/provider/ordering/bookings/${id}/item-decisions`, lab, {
      decisions: [{ catalog_id: 'cbc', decision: 'approved', patient_share: 10 }, { catalog_id: 'hba1c', decision: 'rejected' }], valid_until: new Date(Date.now() + 10 * DAY).toISOString(),
    });
    const a = (await get(`/ordering/bookings/${id}/approval`, patient)).body;
    expect(a.status).toBe('partial');
    expect(a.choices).toEqual(expect.arrayContaining(['pay_difference', 'covered_only', 'cancel_free']));
    const hb = a.items.find((i: any) => i.catalog_id === 'hba1c');
    expect(hb).toMatchObject({ decision: 'rejected', insurer_share: 0, patient_share: 90 }); // the home cash price
    const c = await post(`/ordering/bookings/${id}/partial-choice`, patient, { choice: 'pay_difference' });
    expect(c.status).toBeLessThan(300);
    expect((await get(`/ordering/bookings/${id}/approval`, patient)).body.patient_share_total).toBe(10 + 90 + 30);
    expect(JSON.stringify((await post(`/ordering/bookings/${id}/partial-choice`, patient, { choice: 'covered_only' })).body)).toContain('choice_not_pending');
  });

  it('6. "covered only" drops the rejected items and recomputes the total; the insured part is never paid twice', async () => {
    const id = await bookInsured();
    await post(`/provider/ordering/bookings/${id}/item-decisions`, lab, {
      decisions: [{ catalog_id: 'cbc', decision: 'approved', patient_share: 10 }, { catalog_id: 'hba1c', decision: 'rejected' }], valid_until: new Date(Date.now() + 10 * DAY).toISOString(),
    });
    expect((await post(`/ordering/bookings/${id}/partial-choice`, patient, { choice: 'covered_only' })).status).toBeLessThan(300);
    const a = (await get(`/ordering/bookings/${id}/approval`, patient)).body;
    expect(a.items.map((i: any) => i.catalog_id)).toEqual(['cbc']);
    expect(a.patient_share_total).toBe(10 + 30);
    const b = (await get(`/labs/bookings/${id}`, patient)).body;
    const items = b.items || b.services || [];
    expect(JSON.stringify(items)).not.toContain('hba1c');
  });

  it('7. "cancel free" cancels with a full refund and no fee; a rejected-everything approval also waits for a choice', async () => {
    const id = await bookInsured();
    await post(`/provider/ordering/bookings/${id}/item-decisions`, lab, { decisions: [{ catalog_id: 'cbc', decision: 'rejected' }, { catalog_id: 'hba1c', decision: 'rejected' }] });
    expect((await get(`/ordering/bookings/${id}/approval`, patient)).body.status).toBe('rejected');
    const c = await post(`/ordering/bookings/${id}/partial-choice`, patient, { choice: 'cancel_free' });
    expect(c.status).toBeLessThan(300);
    const b = (await get(`/labs/bookings/${id}`, patient)).body;
    expect(String(b.status ?? b.state)).toMatch(/cancel/);
    expect(b.cancellation_fee ?? 0).toBe(0);
  });

  it('8. an approval that expires before the visit warns and offers an earlier slot', async () => {
    const id = await bookInsured();
    await stack.db.collection('lab_bookings').updateOne({ id }, { $set: { scheduled_start: new Date(Date.now() + 5 * DAY) } });
    await post(`/provider/ordering/bookings/${id}/item-decisions`, lab, {
      decisions: [{ catalog_id: 'cbc', decision: 'approved', patient_share: 10 }, { catalog_id: 'hba1c', decision: 'approved', patient_share: 14 }],
      valid_until: new Date(Date.now() + 1 * DAY).toISOString(),
    });
    const a = (await get(`/ordering/bookings/${id}/approval`, patient)).body;
    expect(a.warning).toBe('approval_expires_before_visit');
    expect(a.rebook_earlier).toBe(true);
  });
});
