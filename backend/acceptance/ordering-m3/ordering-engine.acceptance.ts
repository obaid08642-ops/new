// ACCEPTANCE — Ordering model M3: the ordering engine API (docs/product/ORDERING_MODEL_2026-10-16.md phase M3;
// ORDERING_UX_SPEC §1, §2.1, §2.2). Written by the reviewer before the work; the implementing agent makes it pass and may not
// edit it (nor live-server.ts next to it). Backend part only; the six-step screens (M6) call these routes.
//
// Depends on M1 (the provider item model): providers are declared in this spec through the M1 routes
// (`PUT /provider/ordering/settings`, `PUT /provider/ordering/items`), so M3 starts after M1 is on main.
//
// Reviewer decisions (the owner can redirect): ranking weights are SystemConfig `ordering_ranking_weights`
// (defaults coverage 30, network 20, distance 20, speed 10, rating 10, reliability 10; editable in the admin);
// "from X" prices are cached per area for 10 minutes; the price is locked at booking (`price_locked_at`).
//
// Contract (under /api/v1, patient token):
//   POST /ordering/quote { service_kind: 'lab'|'radiology'|'nursing', items: [catalog_id…], context: { mode: 'home'|'facility',
//        lat, lng, payer: 'cash'|'insurance', family_member_id? }, sort?: 'cheapest'|'nearest'|'fastest'|'rating' }
//     → { quote_id, groups: [{ mode, items: [{ catalog_id, facility_only? }] }]        (a mixed basket is split automatically:
//            an item that cannot be done at home goes to a `facility` group with `facility_only: true`),
//          from_price: { total, providers_count }                                       (lowest total among providers that fit,
//            home fee included for `home`; never a range),
//          best_match: { provider_id, total, estimated_insurance_share, patient_share, distance_km, earliest_at, turnaround_hours } | null,
//          compare: [{ provider_id, total, distance_km, rating, in_network, earliest_at, turnaround_hours }…]  sorted by `sort`,
//          split_suggestion: { assignments: [{ provider_id, catalog_ids }], total } | null  (when no single provider covers every item),
//          empty: null | { reason, alternatives: [{ type: 'facility_nearby'|'broadcast'|'notify_me', ... }] } }
//     A provider outside its own `home_radius_km`, not offering the mode, or with a price missing for an item is not a candidate.
//     With payer `insurance` each row says `in_network` for the patient's saved company and class and each item
//     `coverage: 'covered'|'needs_approval'|'not_covered'` (an estimate; the response says `estimate: true`).
//     No provider phone number, e-mail or account id appears anywhere in the response (public ids only).
//   GET  /ordering/windows?provider_id=&mode=home|facility&date=  → home: 2-hour windows for the next 3 days with `asap: true` entry first;
//        facility: the provider's slots, or { walk_in: true, qr: true } for a walk-in provider.
//   POST /ordering/bookings { quote_id, selections: { [mode]: { provider_id, window?|slot_id?|walk_in? } }, gender_preference?, medical_order_id?,
//        payment_method }  → 201 { order_group_id, bookings: [{ id, mode, status, provider_id, items, total, price_locked_at }],
//        payment: { amount, status: 'pending' } }  one checkout and one payment for the whole group; separate statuses per booking.
//     400 `medical_order_required` (insured labs and radiology need the doctor's order unless `medical_order_id` or an upload is sent),
//     400 `provider_not_candidate` (a provider the quote did not offer), 409 `quote_expired`.
//     After booking, a later change of the provider's price does not change the locked total.
//     With payer `insurance`, every booking (home or facility) is created `awaiting_approval` and is NOT confirmed or payable until the provider's item decisions.
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const BUPA = 'ins-bupa-m3';
const PATIENT = 'pat-m3';
const CENTER = { lat: 24.7136, lng: 46.6753 };
const sign = (payload: Record<string, unknown>) => new JwtService({ secret: JWT_SECRET }).sign(payload);
const providerToken = (id: string, type: string) => sign({ id, sub: id, role: 'provider', provider_type: type, scope: 'provider' });
const near = (km: number) => ({ lat: CENTER.lat + km / 111, lng: CENTER.lng });

// Labs: A cheap and far (home 9 km), B in-network and near (home 2 km), C facility only, rad-1 portable ultrasound at home.
const LABS = [
  { id: 'lab-m3-a', km: 9, home: true, fee: 20, radius: 15, prices: { cbc: [60, 30], hba1c: [90, 50], mri: null as any }, rating: 4.0, bupa: [] as string[] },
  { id: 'lab-m3-b', km: 2, home: true, fee: 30, radius: 5, prices: { cbc: [70, 45], hba1c: [100, 60] }, rating: 4.8, bupa: ['A'] },
  { id: 'lab-m3-c', km: 4, home: false, fee: 0, radius: 0, prices: { cbc: [null, 40], lipid: [null, 80] }, rating: 4.5, bupa: ['A', 'B'] },
];

describe('M3 ordering engine', () => {
  const stack = new LiveStack();
  let patient = '';
  let quoteHome: any;

  const post = (path: string, token: string, body: unknown = {}) => stack.call(0, 'POST', `/api/v1${path}`, token, body);
  const get = (path: string, token: string) => stack.call(0, 'GET', `/api/v1${path}`, token);
  const put = (path: string, token: string, body: unknown) => stack.call(0, 'PUT', `/api/v1${path}`, token, body);
  const quote = (over: any = {}) => post('/ordering/quote', patient, { service_kind: 'lab', items: ['cbc', 'hba1c'], context: { mode: 'home', ...CENTER, payer: 'cash' }, ...over });

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('insurance_companies').insertOne({ id: BUPA, name_ar: 'بوبا', name_en: 'Bupa', active: true, is_active: true });
      await db.collection('lab_services').insertMany([
        { id: 'cbc', code: 'CBC', name_ar: 'صورة دم', price: 50, active: true },
        { id: 'hba1c', code: 'HBA1C', name_ar: 'سكر تراكمي', price: 70, active: true },
        { id: 'lipid', code: 'LIPID', name_ar: 'دهون', price: 80, active: true },
      ]);
      await db.collection('radiology_services').insertOne({ id: 'mri-knee', name_ar: 'رنين ركبة', modality: 'mri', price: 900, portable_ultrasound: false, active: true });
      for (const l of LABS) {
        await db.collection('provider_accounts').insertOne({ id: l.id, provider_type: 'lab', status: 'approved', availability: {} });
        await db.collection('provider_profiles').insertOne({
          id: l.id, user_id: l.id, account_id: l.id, provider_type: 'lab', type: 'lab', status: 'active', public_eligibility: true,
          name_ar: `مختبر ${l.id}`, geo: near(l.km), rating: l.rating, medical_license_number: `LIC-${l.id}`, phone: '+966500000123',
        });
      }
      await db.collection('users').insertOne({ id: PATIENT, full_name: 'Test Patient', role: 'patient', active: true });
    });
    patient = await stack.patient(PATIENT);
    for (const l of LABS) {
      const t = providerToken(l.id, 'lab');
      await put('/provider/ordering/settings', t, {
        modes: l.home ? ['home', 'facility'] : ['facility'], home_fee: l.fee, home_radius_km: l.home ? l.radius : 1, auto_accept: false, walk_in: l.id === 'lab-m3-c',
        accepted_insurance: l.bupa.length ? [{ company_id: BUPA, classes: l.bupa, active: true }] : [],
      });
      for (const [catalog, p] of Object.entries(l.prices)) {
        if (!p) continue;
        const [home, facility] = p as any[];
        await put('/provider/ordering/items', t, { service_kind: 'lab', catalog_id: catalog, prices: { ...(home != null && l.home ? { home } : {}), ...(facility != null ? { facility } : {}) } });
      }
    }
    await stack.db.collection('user_insurance').updateOne({ user_id: PATIENT }, { $set: { user_id: PATIENT, provider: BUPA, class: 'A', policy_number: 'P-1', verified: false } }, { upsert: true });
    await post('/users/me/insurance', patient, { provider: BUPA, class: 'A', policy_number: 'P-1' });
  });
  afterAll(async () => { await stack.stop(); });

  it('1. "from X": the lowest total among fitting providers, home fee included, a number and a count (no range)', async () => {
    const r = await quote();
    expect(r.status).toBe(200);
    quoteHome = r.body;
    // lab-a: 60+90+20 = 170 (home, within 15 km); lab-b: 70+100+30 = 200 (2 km, within 5 km); lab-c has no home mode
    expect(r.body.from_price).toMatchObject({ total: 170, providers_count: 2 });
    expect(typeof r.body.from_price.total).toBe('number');
    expect(r.body.groups).toEqual([expect.objectContaining({ mode: 'home' })]);
    expect(r.body.empty).toBeNull();
  });

  it('2. radius and mode filter candidates: a provider outside its own radius or without the mode is not offered', async () => {
    const far = await quote({ context: { mode: 'home', lat: near(12).lat, lng: CENTER.lng, payer: 'cash' } });
    const ids = (far.body.compare || []).map((c: any) => c.provider_id);
    expect(ids).toContain('lab-m3-a'); // 3 km from lab-a, within its 15 km
    expect(ids).not.toContain('lab-m3-b'); // 10 km from lab-b, beyond its 5 km
    expect(ids).not.toContain('lab-m3-c'); // facility only
  });

  it('3. a facility-only item is labelled and goes to the facility group, never an error', async () => {
    const radiology = await post('/ordering/quote', patient, { service_kind: 'radiology', items: ['mri-knee'], context: { mode: 'home', ...CENTER, payer: 'cash' } });
    expect(radiology.status).toBe(200);
    const groups = radiology.body.groups || [];
    expect(groups.find((g: any) => g.mode === 'facility')?.items[0]).toMatchObject({ catalog_id: 'mri-knee', facility_only: true });
    expect(groups.find((g: any) => g.mode === 'home')).toBeUndefined();
  });

  it('4. best match, compare sorted by the chosen key, and no personal data of the providers', async () => {
    const cheapest = (await quote({ sort: 'cheapest' })).body;
    expect(cheapest.compare.map((c: any) => c.provider_id)[0]).toBe('lab-m3-a');
    const nearest = (await quote({ sort: 'nearest' })).body;
    expect(nearest.compare.map((c: any) => c.provider_id)[0]).toBe('lab-m3-b');
    const rated = (await quote({ sort: 'rating' })).body;
    expect(rated.compare.map((c: any) => c.provider_id)[0]).toBe('lab-m3-b');
    expect(cheapest.best_match).toMatchObject({ provider_id: expect.any(String), total: expect.any(Number), distance_km: expect.any(Number) });
    const text = JSON.stringify(cheapest);
    expect(text).not.toContain('+966500000123');
    expect(text).not.toMatch(/"(phone|email|account_id|user_id)"/);
  });

  it('5. ranking weights come from SystemConfig: editing them changes the best match', async () => {
    const before = (await quote()).body.best_match.provider_id;
    await stack.db.collection('system_configs').updateOne({ key: 'ordering_ranking_weights' },
      { $set: { key: 'ordering_ranking_weights', value: { coverage: 0, network: 0, distance: 0, speed: 0, rating: 0, reliability: 0, price: 100 } } }, { upsert: true });
    const priceOnly = (await quote()).body.best_match.provider_id;
    expect(priceOnly).toBe('lab-m3-a');
    await stack.db.collection('system_configs').updateOne({ key: 'ordering_ranking_weights' },
      { $set: { value: { coverage: 0, network: 0, distance: 100, speed: 0, rating: 0, reliability: 0, price: 0 } } });
    expect((await quote()).body.best_match.provider_id).toBe('lab-m3-b');
    await stack.db.collection('system_configs').deleteOne({ key: 'ordering_ranking_weights' });
    expect(before).toBeTruthy();
  });

  it('6. insurance: in-network rows, per-item coverage as an estimate', async () => {
    const r = await quote({ context: { mode: 'facility', ...CENTER, payer: 'insurance' } });
    expect(r.status).toBe(200);
    expect(r.body.estimate).toBe(true);
    const byId = Object.fromEntries(r.body.compare.map((c: any) => [c.provider_id, c]));
    expect(byId['lab-m3-b'].in_network).toBe(true);
    expect(byId['lab-m3-c'].in_network).toBe(true);
    expect(byId['lab-m3-a'].in_network).toBe(false);
    expect(['covered', 'needs_approval', 'not_covered']).toContain(r.body.best_match.items?.[0]?.coverage ?? 'needs_approval');
    expect(r.body.best_match).toHaveProperty('estimated_insurance_share');
    expect(r.body.best_match).toHaveProperty('patient_share');
  });

  it('7. never an empty dead end: no candidate offers the nearest way forward', async () => {
    const nowhere = await quote({ context: { mode: 'home', lat: 26.5, lng: 50.2, payer: 'cash' } });
    expect(nowhere.status).toBe(200);
    expect(nowhere.body.best_match).toBeNull();
    expect(nowhere.body.empty.alternatives.map((a: any) => a.type)).toEqual(expect.arrayContaining(['broadcast']));
    expect(await stack.db.collection('coverage_gaps').countDocuments({})).toBeGreaterThanOrEqual(1); // the admin sees it as a gap
  });

  it('8. a split suggestion when no single provider covers every item', async () => {
    // lab-c is the only one pricing `lipid` at the facility; a and b are the only ones pricing hba1c: nobody covers both
    const r = await quote({ items: ['hba1c', 'lipid'], context: { mode: 'facility', ...CENTER, payer: 'cash' } });
    expect(r.status).toBe(200);
    expect(r.body.best_match).toBeNull();
    expect(r.body.split_suggestion.assignments).toHaveLength(2);
    const byProvider = Object.fromEntries(r.body.split_suggestion.assignments.map((a: any) => [a.provider_id, a.catalog_ids]));
    expect(byProvider['lab-m3-c']).toEqual(['lipid']);
    expect(Object.keys(byProvider).filter((id) => id !== 'lab-m3-c')).toHaveLength(1);
    // cheapest split: hba1c at lab-a (facility 50) + lipid at lab-c (80)
    expect(byProvider['lab-m3-a']).toEqual(['hba1c']);
    expect(r.body.split_suggestion.total).toBe(130);
  });

  it('9. windows: home = 2-hour windows for 3 days with ASAP first; walk-in provider = walk-in with QR', async () => {
    const home = await get('/ordering/windows?provider_id=lab-m3-b&mode=home', patient);
    expect(home.status).toBe(200);
    const rows: any[] = home.body.windows || home.body;
    expect(rows[0]).toMatchObject({ asap: true });
    const timed = rows.filter((w) => !w.asap);
    expect(timed.length).toBeGreaterThanOrEqual(3);
    expect(new Date(timed[0].end).getTime() - new Date(timed[0].start).getTime()).toBe(2 * 3_600_000);
    const walkIn = await get('/ordering/windows?provider_id=lab-m3-c&mode=facility', patient);
    expect(walkIn.body).toMatchObject({ walk_in: true, qr: true });
  });

  it('10. booking: one group, one payment, separate statuses; the price is locked; a stranger provider is refused', async () => {
    const q = (await quote()).body;
    const bad = await post('/ordering/bookings', patient, { quote_id: q.quote_id, selections: { home: { provider_id: 'lab-m3-c', window: { asap: true } } }, payment_method: 'card' });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toContain('provider_not_candidate');
    const ok = await post('/ordering/bookings', patient, { quote_id: q.quote_id, selections: { home: { provider_id: 'lab-m3-a', window: { asap: true } } }, payment_method: 'card' });
    expect(ok.status).toBe(201);
    expect(ok.body.order_group_id).toBeTruthy();
    expect(ok.body.bookings).toHaveLength(1);
    expect(ok.body.bookings[0]).toMatchObject({ mode: 'home', provider_id: 'lab-m3-a', total: 170 });
    expect(ok.body.bookings[0].price_locked_at).toBeTruthy();
    expect(ok.body.payment).toMatchObject({ amount: 170, status: 'pending' });
    // the provider raises its price afterwards: the locked total does not move
    await put('/provider/ordering/items', providerToken('lab-m3-a', 'lab'), { service_kind: 'lab', catalog_id: 'cbc', prices: { home: 500, facility: 30 } });
    const again = await get(`/labs/bookings/${ok.body.bookings[0].id}`, patient);
    expect(again.status).toBe(200);
    expect(again.body.total ?? again.body.price?.total).toBe(170);
  });

  it('11. insured labs need the doctor\'s order; an insured home booking waits for approval and is not dispatched', async () => {
    const q = (await quote({ context: { mode: 'home', ...CENTER, payer: 'insurance' } })).body;
    const noOrder = await post('/ordering/bookings', patient, { quote_id: q.quote_id, selections: { home: { provider_id: 'lab-m3-b', window: { asap: true } } }, payment_method: 'insurance' });
    expect(noOrder.status).toBe(400);
    expect(JSON.stringify(noOrder.body)).toContain('medical_order_required');
    await stack.db.collection('medical_orders').insertOne({
      id: 'mo-m3', patient_id: PATIENT, doctor_id: 'doc-x', status: 'active', valid_until: new Date(Date.now() + 10 * 86_400_000),
      items: [{ id: 'mo-m3-1', group: 'labs', catalog_id: 'cbc', status: 'open' }, { id: 'mo-m3-2', group: 'labs', catalog_id: 'hba1c', status: 'open' }], createdAt: new Date(),
    });
    const ok = await post('/ordering/bookings', patient, { quote_id: q.quote_id, selections: { home: { provider_id: 'lab-m3-b', window: { asap: true } } }, payment_method: 'insurance', medical_order_id: 'mo-m3' });
    expect(ok.status).toBe(201);
    expect(ok.body.bookings[0].status).toBe('awaiting_approval');
    const inbox = await get('/labs/provider/inbox', providerToken('lab-m3-b', 'lab'));
    const dispatched = JSON.stringify(inbox.body).includes(ok.body.bookings[0].id) && /"status":"(accepted|on_the_way|assigned)"/.test(JSON.stringify(inbox.body));
    expect(dispatched).toBe(false);
  });

  it('12. an insured facility (in-centre) booking waits for the approval too', async () => {
    const q = (await quote({ items: ['cbc'], context: { mode: 'facility', ...CENTER, payer: 'insurance' } })).body;
    const ok = await post('/ordering/bookings', patient, { quote_id: q.quote_id, selections: { facility: { provider_id: 'lab-m3-c', walk_in: true } }, payment_method: 'insurance', medical_order_id: 'mo-m3' });
    expect(ok.status).toBe(201);
    expect(ok.body.bookings[0]).toMatchObject({ mode: 'facility', status: 'awaiting_approval' });
  });
});
