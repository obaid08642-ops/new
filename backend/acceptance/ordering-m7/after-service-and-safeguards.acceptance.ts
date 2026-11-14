// ACCEPTANCE — Ordering model M7: after the booking and the safeguards (docs/product/ORDERING_MODEL_2026-10-16.md phase M7;
// ORDERING_UX_SPEC §2.1 step 7, §4 risks, owner answers on #1700). Written by the reviewer before the work; the implementing agent
// makes it pass and may not edit it (nor live-server.ts next to it). Backend part only. Builds on M1 (declarations) and M3 (bookings).
//
// Owner answers (#1700): digits are Western (0-9) everywhere, the 4-digit arrival code included; the emergency button in the
// visit screen CALLS the configured urgent-help number (SystemConfig `mental_health_urgent_help`.value.phone, 997 when unset) and
// notifies Nabd support with the booking id; it dispatches nothing.
// Reviewer decisions: the confirm deadline is SystemConfig `ordering_confirm_deadline_seconds` (default 900); reliability weights
// default to the ranking weights of M3; a provider's reliability = acceptance rate, on-time rate and cancellation rate.
//
// Contract (under /api/v1; every booking below comes from POST /ordering/bookings of M3):
//   Confirm deadline:   POST /provider/ordering/bookings/:id/confirm (the booking's provider). A booking not confirmed before the deadline is
//        `cancelled_unconfirmed`, its payment refund is `initiated` at once, and `GET /ordering/bookings/:id` carries
//        `alternative: { provider_id, total, earliest_at } | null` (the next best candidate). A late confirm → 409 `confirm_deadline_passed`.
//   Visit:  GET /ordering/bookings/:id/visit (the patient) → { status, provider: { id, name, license, photo_url }, staff?: { id, name, license, photo_url, gender },
//        arrival_code?, eta_minutes? }. The 4-digit `arrival_code` (^[0-9]{4}$) exists only once a staff member is assigned; no phone number anywhere.
//        POST /provider/ordering/bookings/:id/assign { staff_id } (400 `staff_gender_mismatch` when the booking asks for a gender the member is not;
//        404 for a staff member of another provider).
//        POST /provider/ordering/bookings/:id/arrive { code } → wrong code 400 `arrival_code_invalid` (the 3rd wrong try locks it, 423 `arrival_code_locked`);
//        right code → status `in_service`.
//   Gender preference:  `gender_preference: 'female'|'male'` is a booking field (M3) and a quote filter `context.staff_gender`: a provider without
//        staff of that gender is not a candidate.
//   Reminders:  GET /ordering/bookings/:id/reminders → [{ kind: 'fasting_night'|'fasting_morning'|'preparation', at }]; an item with preparation
//        `fasting_hours` produces the night-before (20:00 local) and the morning reminder (the visit's day, 2 h before at most 07:00).
//   Results:  POST /provider/ordering/bookings/:id/results { values: [{ catalog_id, value, unit, range: { low, high } }] } (the provider) →
//        GET /ordering/bookings/:id/results (the patient) → { values: [{ catalog_id, name, value, unit, range, flag: 'normal'|'high'|'low', trend: [{ date, value }…] }],
//        discuss_with_doctor: { available: true } }; `trend` lists the patient's earlier results of the same test, oldest first, the current last.
//        POST /ordering/bookings/:id/results/discuss → 201 { consultation_draft: true, attached_result_id } (opens the instant-consultation flow with the result attached;
//        no broadcast yet). Another patient → 404.
//   Reliability:  GET /provider/ordering/reliability → { acceptance_rate, on_time_rate, cancellation_rate } in 0..1; a provider with many
//        cancellations ranks lower in the M3 best match than an otherwise equal one.
//   Emergency:  POST /ordering/bookings/:id/emergency (the patient, during a visit) → { call: '<number>' }; support gets a record carrying the booking id; no dispatch.
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const PATIENT = 'pat-m7';
const PATIENT_2 = 'pat-m7-two';
const A = 'lab-m7-a';
const B = 'lab-m7-b';
const CENTER = { lat: 24.7136, lng: 46.6753 };
const sign = (payload: Record<string, unknown>) => new JwtService({ secret: JWT_SECRET }).sign(payload);
const providerToken = (id: string) => sign({ id, sub: id, role: 'provider', provider_type: 'lab', scope: 'provider' });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('M7 after the booking and safeguards', () => {
  const stack = new LiveStack();
  let patient = '';
  let patient2 = '';
  const a = providerToken(A);
  const b = providerToken(B);

  const post = (path: string, token: string, body: unknown = {}) => stack.call(0, 'POST', `/api/v1${path}`, token, body);
  const get = (path: string, token: string) => stack.call(0, 'GET', `/api/v1${path}`, token);
  const put = (path: string, token: string, body: unknown) => stack.call(0, 'PUT', `/api/v1${path}`, token, body);

  /** One cash home booking of `items` with provider `providerId`. */
  const book = async (items: string[], providerId = A, extra: any = {}): Promise<string> => {
    const q = await post('/ordering/quote', patient, { service_kind: 'lab', items, context: { mode: 'home', ...CENTER, payer: 'cash', ...(extra.context || {}) } });
    const r = await post('/ordering/bookings', patient, { quote_id: q.body.quote_id, selections: { home: { provider_id: providerId, window: { asap: true } } }, payment_method: 'card', ...(extra.body || {}) });
    expect(r.status).toBe(201);
    return r.body.bookings[0].id;
  };

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('lab_services').insertMany([
        { id: 'hba1c', code: 'HBA1C', name_ar: 'سكر تراكمي', price: 70, active: true },
        { id: 'cbc', code: 'CBC', name_ar: 'صورة دم', price: 50, active: true },
      ]);
      for (const [id, km] of [[A, 2], [B, 3]] as const) {
        await db.collection('provider_accounts').insertOne({ id, provider_type: 'lab', status: 'approved', availability: {} });
        await db.collection('provider_profiles').insertOne({
          id, user_id: id, account_id: id, provider_type: 'lab', type: 'lab', status: 'active', public_eligibility: true,
          name_ar: `مختبر ${id}`, geo: { lat: CENTER.lat + km / 111, lng: CENTER.lng }, rating: 4.5, medical_license_number: `LIC-${id}`, phone: '+966500000555',
        });
      }
      await db.collection('provider_staff').insertMany([
        { id: 'staff-m7-f', provider_account_id: A, name: 'Sara', gender: 'female', license_number: 'SCFHS-1', photo_url: 'https://cdn.example.test/sara.jpg', active: true },
        { id: 'staff-m7-m', provider_account_id: A, name: 'Omar', gender: 'male', license_number: 'SCFHS-2', photo_url: 'https://cdn.example.test/omar.jpg', active: true },
        { id: 'staff-m7-b', provider_account_id: B, name: 'Huda', gender: 'female', license_number: 'SCFHS-3', active: true },
      ]);
      await db.collection('system_configs').insertMany([
        { key: 'ordering_confirm_deadline_seconds', value: 4 },
        { key: 'mental_health_urgent_help', value: { phone: '997' } },
      ]);
    });
    patient = await stack.patient(PATIENT);
    patient2 = await stack.patient(PATIENT_2);
    for (const id of [A, B]) {
      const t = providerToken(id);
      await put('/provider/ordering/settings', t, { modes: ['home', 'facility'], home_fee: 20, home_radius_km: 15, accepted_insurance: [], staff_genders: id === A ? ['female', 'male'] : ['female'] });
      await put('/provider/ordering/items', t, { service_kind: 'lab', catalog_id: 'hba1c', prices: { home: 90, facility: 70 }, preparation: { en: 'Fast 8 hours', ar: 'صيام ٨ ساعات' } });
      await put('/provider/ordering/items', t, { service_kind: 'lab', catalog_id: 'cbc', prices: { home: id === A ? 60 : 62, facility: 50 } });
    }
  });
  afterAll(async () => { await stack.stop(); });

  it('1. the provider must confirm in time; otherwise auto-cancel, refund started, the next best provider offered', async () => {
    const id = await book(['cbc']);
    const late = await get(`/ordering/bookings/${id}`, patient);
    expect(late.status).toBe(200);
    expect(late.body.status).not.toMatch(/cancel/);
    await sleep(6_000);
    const after = (await get(`/ordering/bookings/${id}`, patient)).body;
    expect(after.status).toBe('cancelled_unconfirmed');
    expect(after.payment?.refund_status).toBe('initiated');
    expect(after.alternative).toMatchObject({ provider_id: B, total: expect.any(Number) });
    const confirm = await post(`/provider/ordering/bookings/${id}/confirm`, a);
    expect(confirm.status).toBe(409);
    expect(JSON.stringify(confirm.body)).toContain('confirm_deadline_passed');
    // a confirmed booking is not cancelled
    const ok = await book(['cbc']);
    expect((await post(`/provider/ordering/bookings/${ok}/confirm`, a)).status).toBeLessThan(300);
    await sleep(5_000);
    expect((await get(`/ordering/bookings/${ok}`, patient)).body.status).not.toMatch(/cancel/);
  });

  it('2. the arrival code: only after assignment, 4 Western digits, no phone numbers, wrong tries lock it', async () => {
    const id = await book(['hba1c']);
    await post(`/provider/ordering/bookings/${id}/confirm`, a);
    const before = (await get(`/ordering/bookings/${id}/visit`, patient)).body;
    expect(before.arrival_code).toBeUndefined();
    expect((await post(`/provider/ordering/bookings/${id}/assign`, a, { staff_id: 'staff-m7-b' })).status).toBe(404); // another provider's staff
    expect((await post(`/provider/ordering/bookings/${id}/assign`, a, { staff_id: 'staff-m7-f' })).status).toBeLessThan(300);
    const visit = (await get(`/ordering/bookings/${id}/visit`, patient)).body;
    expect(visit.arrival_code).toMatch(/^[0-9]{4}$/);
    expect(visit.staff).toMatchObject({ name: 'Sara', license: 'SCFHS-1', gender: 'female' });
    expect(visit.provider).toHaveProperty('license');
    expect(JSON.stringify(visit)).not.toContain('+966500000555');
    expect((await get(`/ordering/bookings/${id}/visit`, patient2)).status).toBe(404);

    const wrong = visit.arrival_code === '0000' ? '1111' : '0000';
    for (let i = 0; i < 2; i++) {
      const r = await post(`/provider/ordering/bookings/${id}/arrive`, a, { code: wrong });
      expect(r.status).toBe(400);
      expect(JSON.stringify(r.body)).toContain('arrival_code_invalid');
    }
    expect((await post(`/provider/ordering/bookings/${id}/arrive`, a, { code: wrong })).status).toBe(423);
    expect((await post(`/provider/ordering/bookings/${id}/arrive`, a, { code: visit.arrival_code })).status).toBe(423); // locked even for the right code

    const id2 = await book(['hba1c']);
    await post(`/provider/ordering/bookings/${id2}/confirm`, a);
    await post(`/provider/ordering/bookings/${id2}/assign`, a, { staff_id: 'staff-m7-f' });
    const code2 = (await get(`/ordering/bookings/${id2}/visit`, patient)).body.arrival_code;
    expect((await post(`/provider/ordering/bookings/${id2}/arrive`, a, { code: code2 })).status).toBeLessThan(300);
    expect((await get(`/ordering/bookings/${id2}/visit`, patient)).body.status).toBe('in_service');
  });

  it('3. gender preference: the quote drops providers without that staff; assignment refuses a mismatch', async () => {
    const onlyFemale = await post('/ordering/quote', patient, { service_kind: 'lab', items: ['cbc'], context: { mode: 'home', ...CENTER, payer: 'cash', staff_gender: 'male' } });
    expect(onlyFemale.body.compare.map((c: any) => c.provider_id)).toEqual([A]); // B has female staff only
    const id = await book(['cbc'], A, { body: { gender_preference: 'female' } });
    await post(`/provider/ordering/bookings/${id}/confirm`, a);
    const wrong = await post(`/provider/ordering/bookings/${id}/assign`, a, { staff_id: 'staff-m7-m' });
    expect(wrong.status).toBe(400);
    expect(JSON.stringify(wrong.body)).toContain('staff_gender_mismatch');
    expect((await post(`/provider/ordering/bookings/${id}/assign`, a, { staff_id: 'staff-m7-f' })).status).toBeLessThan(300);
  });

  it('4. preparation reminders: the night before and the morning of a fasting test', async () => {
    const id = await book(['hba1c']);
    const day = new Date(Date.now() + 2 * 86_400_000);
    day.setHours(9, 0, 0, 0);
    await stack.db.collection('lab_bookings').updateOne({ id }, { $set: { scheduled_start: day } });
    const r = await get(`/ordering/bookings/${id}/reminders`, patient);
    expect(r.status).toBe(200);
    const list: any[] = Array.isArray(r.body) ? r.body : r.body.reminders;
    const night = list.find((x) => x.kind === 'fasting_night');
    const morning = list.find((x) => x.kind === 'fasting_morning');
    expect(night).toBeTruthy();
    expect(morning).toBeTruthy();
    expect(new Date(night.at).getTime()).toBeLessThan(day.getTime() - 8 * 3_600_000);
    expect(new Date(morning.at).getTime()).toBeLessThan(day.getTime());
    expect(new Date(morning.at).getTime()).toBeGreaterThan(new Date(night.at).getTime());
    // an item without preparation has no fasting reminder
    const cbc = await book(['cbc']);
    const none: any[] = (await get(`/ordering/bookings/${cbc}/reminders`, patient)).body.reminders ?? [];
    expect(none.find((x) => x.kind === 'fasting_night')).toBeUndefined();
  });

  it('5. results come as values with ranges and trends across the patient\'s earlier results; discuss opens a draft with the result attached', async () => {
    const submit = async (id: string, value: number) => post(`/provider/ordering/bookings/${id}/results`, a, { values: [{ catalog_id: 'hba1c', value, unit: '%', range: { low: 4, high: 5.6 } }] });
    const first = await book(['hba1c']);
    await post(`/provider/ordering/bookings/${first}/confirm`, a);
    expect((await submit(first, 6.4)).status).toBeLessThan(300);
    await sleep(50);
    const second = await book(['hba1c']);
    await post(`/provider/ordering/bookings/${second}/confirm`, a);
    expect((await submit(second, 5.4)).status).toBeLessThan(300);
    const r = await get(`/ordering/bookings/${second}/results`, patient);
    expect(r.status).toBe(200);
    const v = r.body.values[0];
    expect(v).toMatchObject({ catalog_id: 'hba1c', value: 5.4, unit: '%', flag: 'normal' });
    expect(v.trend.map((p: any) => p.value)).toEqual([6.4, 5.4]);
    expect(r.body.discuss_with_doctor.available).toBe(true);
    expect((await get(`/ordering/bookings/${first}/results`, patient)).body.values[0].flag).toBe('high');
    expect((await get(`/ordering/bookings/${second}/results`, patient2)).status).toBe(404);
    const d = await post(`/ordering/bookings/${second}/results/discuss`, patient);
    expect(d.status).toBe(201);
    expect(d.body).toMatchObject({ consultation_draft: true });
    expect(d.body.attached_result_id).toBeTruthy();
    expect((await post(`/ordering/bookings/${second}/results/discuss`, patient2)).status).toBe(404);
    // another provider cannot post results for this booking
    expect((await post(`/provider/ordering/bookings/${second}/results`, b, { values: [{ catalog_id: 'hba1c', value: 1, unit: '%', range: { low: 4, high: 5.6 } }] })).status).toBeGreaterThanOrEqual(403);
  });

  it('6. reliability: the provider reads its rates; cancellations lower the ranking of an otherwise equal provider', async () => {
    const rel = await get('/provider/ordering/reliability', a);
    expect(rel.status).toBe(200);
    for (const k of ['acceptance_rate', 'on_time_rate', 'cancellation_rate']) {
      expect(rel.body[k]).toBeGreaterThanOrEqual(0);
      expect(rel.body[k]).toBeLessThanOrEqual(1);
    }
    // prices are equal at the facility; make A cancel a lot
    await stack.db.collection('provider_reliability').updateOne({ provider_account_id: A }, { $set: { provider_account_id: A, cancellations: 20, completed: 2, accepted: 3, offered: 20, on_time: 1 } }, { upsert: true });
    const before = await post('/ordering/quote', patient, { service_kind: 'lab', items: ['hba1c'], context: { mode: 'facility', ...CENTER, payer: 'cash' } });
    expect(before.body.best_match.provider_id).toBe(B);
    const relA = await get('/provider/ordering/reliability', a);
    expect(relA.body.cancellation_rate).toBeGreaterThan(0.5);
  });

  it('7. the emergency button calls the configured number and tells support; it dispatches nothing', async () => {
    const id = await book(['hba1c']);
    await post(`/provider/ordering/bookings/${id}/confirm`, a);
    const r = await post(`/ordering/bookings/${id}/emergency`, patient);
    expect(r.status).toBeLessThan(300);
    expect(r.body.call).toBe('997');
    const note = await stack.db.collection('support_tickets').findOne({ booking_id: id });
    const alt = note || await stack.db.collection('admin_alerts').findOne({ booking_id: id });
    expect(alt).toBeTruthy();
    expect(await stack.db.collection('ambulance_requests').countDocuments({})).toBe(0); // D-14: nothing is dispatched
    await stack.db.collection('system_configs').updateOne({ key: 'mental_health_urgent_help' }, { $set: { value: { phone: '112' } } });
    expect((await post(`/ordering/bookings/${id}/emergency`, patient)).body.call).toBe('112');
    expect((await post(`/ordering/bookings/${id}/emergency`, patient2)).status).toBe(404);
  });
});
