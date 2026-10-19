// ACCEPTANCE — Ordering model M4: ASAP and photo-order broadcast (docs/product/ORDERING_MODEL_2026-10-16.md phase M4;
// ORDERING_UX_SPEC §2.1 steps 1 and 5; the pharmacy broadcast engine generalised). Written by the reviewer before the work;
// the implementing agent makes it pass and may not edit it (nor live-server.ts next to it). Backend part only.
//
// Depends on M1 (the provider item model, declared here through its routes) and reuses the pharmacy broadcast engine
// (`pharmacy_broadcast_stages` stays as it is for pharmacies; labs, radiology and nursing read `ordering_asap_stages`).
//
// Owner decisions: stages 3 → 5 → 8 km at 3 minutes each, editable in the admin (SystemConfig `ordering_asap_stages`:
// [{ radius_km, timeout_seconds }, …]; this spec seeds 2-second stages so it runs fast); at most 3 stages; then the earliest
// window is offered. Providers with `auto_accept` accept the moment the broadcast reaches them.
//
// Contract (under /api/v1):
//   POST /ordering/asap (patient) { service_kind, items: [catalog_id…], lat, lng, payer: 'cash'|'insurance' }
//     → 201 { id, status: 'broadcasting'|'accepted', stage, radius_km, stage_ends_at, providers_notified, booking_id? }
//     Only providers that offer `home` for EVERY item, are within the stage radius and within their own `home_radius_km` are reached;
//     an auto-accept provider reached at a stage accepts at once (nearest first); the broadcast then ends with `accepted` and a booking.
//     400 `asap_items_required`; 409 `asap_open` (one open ASAP per patient).
//   GET  /ordering/asap/:id (the patient) → { id, status: 'broadcasting'|'accepted'|'expired'|'cancelled', stage, radius_km, seconds_left,
//     accepted_by?, booking_id?, fallback?: { earliest_window: { provider_id, start, end } | null } }  the stage moves 1 → 2 → 3 when
//     its timeout passes with no acceptance; after the last stage `expired` with the earliest window offered.
//   GET  /provider/ordering/broadcasts (provider) → open broadcasts the provider was reached by.
//   POST /provider/ordering/broadcasts/:id/accept (provider) → the first wins; a second → 409 `broadcast_already_taken`; one never reached → 404.
//   POST /ordering/asap/:id/cancel (patient).
//
//   POST /ordering/photo-order (patient) { service_kind, upload_id, lat, lng, payer }
//     the AI scanner reads the paper order; a reading that is not confident (always the case when no AI provider is configured,
//     as here) becomes a broadcast for priced offers: → 201 { id, status: 'awaiting_offers', items_unconfirmed: true, providers_notified }.
//     400 `photo_upload_required`; 404 for an upload that is not the patient's.
//   POST /provider/ordering/broadcasts/:id/offer (provider reached) { items: [{ name, price }], note? } → the provider confirms the items before pricing;
//        `total` is the sum; a second offer from the same provider replaces the first.
//   GET  /ordering/photo-order/:id/offers (patient) → offers sorted by total with the public provider id, rating and distance (no phone numbers).
//   POST /ordering/photo-order/:id/offers/:offerId/accept (patient) → 201 { booking_id }; the other offers close; a second accept → 409.
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const PATIENT = 'pat-m4';
const PATIENT_2 = 'pat-m4-two';
const CENTER = { lat: 24.7136, lng: 46.6753 };
const near = (km: number) => ({ lat: CENTER.lat + km / 111, lng: CENTER.lng });
const sign = (payload: Record<string, unknown>) => new JwtService({ secret: JWT_SECRET }).sign(payload);
const providerToken = (id: string) => sign({ id, sub: id, role: 'provider', provider_type: 'lab', scope: 'provider' });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 2 km manual, 6 km auto-accept, 9 km out of every stage, 2.5 km without a price for the item
const LABS = [
  { id: 'lab-m4-near', km: 2, auto: false, priced: true },
  { id: 'lab-m4-mid', km: 6, auto: true, priced: true },
  { id: 'lab-m4-far', km: 9, auto: true, priced: true },
  { id: 'lab-m4-noprice', km: 2.5, auto: true, priced: false },
];

describe('M4 ASAP and photo-order broadcast', () => {
  const stack = new LiveStack();
  let patient = '';
  let patient2 = '';

  const post = (path: string, token: string, body: unknown = {}) => stack.call(0, 'POST', `/api/v1${path}`, token, body);
  const get = (path: string, token: string) => stack.call(0, 'GET', `/api/v1${path}`, token);
  const put = (path: string, token: string, body: unknown) => stack.call(0, 'PUT', `/api/v1${path}`, token, body);
  const rows = (b: any) => (Array.isArray(b) ? b : b?.items || b?.broadcasts || b?.offers || []);
  const asap = (token = patient, over: any = {}) => post('/ordering/asap', token, { service_kind: 'lab', items: ['cbc'], ...CENTER, payer: 'cash', ...over });
  const setAuto = (id: string, auto: boolean) => put('/provider/ordering/settings', providerToken(id), { modes: ['home', 'facility'], home_fee: 20, home_radius_km: 15, auto_accept: auto, accepted_insurance: [] });

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('lab_services').insertOne({ id: 'cbc', code: 'CBC', name_ar: 'صورة دم', price: 50, active: true });
      for (const l of LABS) {
        await db.collection('provider_accounts').insertOne({ id: l.id, provider_type: 'lab', status: 'approved', availability: {} });
        await db.collection('provider_profiles').insertOne({
          id: l.id, user_id: l.id, account_id: l.id, provider_type: 'lab', type: 'lab', status: 'active', public_eligibility: true,
          name_ar: `مختبر ${l.id}`, geo: near(l.km), rating: 4.2, medical_license_number: `LIC-${l.id}`, phone: '+966500000777',
        });
      }
      await db.collection('system_configs').insertOne({ key: 'ordering_asap_stages', value: [{ radius_km: 3, timeout_seconds: 2 }, { radius_km: 5, timeout_seconds: 2 }, { radius_km: 8, timeout_seconds: 2 }] });
      await db.collection('uploads').insertOne({ id: 'up-m4', owner_id: PATIENT, kind: 'prescription_photo', mime: 'image/png', createdAt: new Date() });
    });
    patient = await stack.patient(PATIENT);
    patient2 = await stack.patient(PATIENT_2);
    for (const l of LABS) {
      await setAuto(l.id, l.auto);
      if (l.priced) await put('/provider/ordering/items', providerToken(l.id), { service_kind: 'lab', catalog_id: 'cbc', prices: { home: 60, facility: 40 } });
    }
  });
  afterAll(async () => { await stack.stop(); });

  it('1. stage 1 (3 km) reaches only providers inside it; a manual provider sees the broadcast and nobody else does', async () => {
    const r = await asap();
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: 'broadcasting', stage: 1, radius_km: 3, providers_notified: 1 }); // lab-near; noprice has no price
    const id = r.body.id;
    expect(rows((await get('/provider/ordering/broadcasts', providerToken('lab-m4-near'))).body).map((b: any) => b.id)).toContain(id);
    expect(rows((await get('/provider/ordering/broadcasts', providerToken('lab-m4-mid'))).body).map((b: any) => b.id)).not.toContain(id);
    expect(rows((await get('/provider/ordering/broadcasts', providerToken('lab-m4-noprice'))).body)).toHaveLength(0);
    const dup = await asap();
    expect(dup.status).toBe(409);
    expect(JSON.stringify(dup.body)).toContain('asap_open');
    // the stage widens to 5 km when the first times out; the 6 km auto-accept provider is still out; then 8 km reaches it
    await sleep(2_500);
    expect((await get(`/ordering/asap/${id}`, patient)).body).toMatchObject({ stage: 2, radius_km: 5, status: 'broadcasting' });
    await sleep(3_000); // t ≈ 5.5 s: stage 3 (8 km) began at 4 s and the 6 km auto-accept provider took it
    const final = (await get(`/ordering/asap/${id}`, patient)).body;
    expect(final).toMatchObject({ status: 'accepted', accepted_by: 'lab-m4-mid' }); // auto-accept at stage 3 (8 km)
    expect(final.booking_id).toBeTruthy();
    expect(rows((await get('/provider/ordering/broadcasts', providerToken('lab-m4-near'))).body).map((b: any) => b.id)).not.toContain(id);
  });

  it('2. an auto-accept provider inside the first stage accepts at once', async () => {
    await setAuto('lab-m4-near', true);
    const r = await asap(patient2);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: 'accepted', stage: 1 });
    expect(r.body.booking_id).toBeTruthy();
    expect((await get(`/ordering/asap/${r.body.id}`, patient2)).body.accepted_by).toBe('lab-m4-near');
    await setAuto('lab-m4-near', false);
  });

  it('3. the first manual acceptance wins; a second is told it is taken; one that was never reached gets 404', async () => {
    await setAuto('lab-m4-mid', false);
    await setAuto('lab-m4-far', false);
    await setAuto('lab-m4-noprice', false);
    const r = await asap();
    expect(r.status).toBe(201);
    const id = r.body.id;
    expect((await post(`/provider/ordering/broadcasts/${id}/accept`, providerToken('lab-m4-mid'))).status).toBe(404); // not yet reached (6 km)
    const first = await post(`/provider/ordering/broadcasts/${id}/accept`, providerToken('lab-m4-near'));
    expect(first.status).toBe(200);
    expect(first.body.booking_id).toBeTruthy();
    expect((await get(`/ordering/asap/${id}`, patient)).body).toMatchObject({ status: 'accepted', accepted_by: 'lab-m4-near' });
    const second = await post(`/provider/ordering/broadcasts/${id}/accept`, providerToken('lab-m4-near'));
    expect(second.status).toBe(409);
    expect(JSON.stringify(second.body)).toContain('broadcast_already_taken');
  });

  it('4. nobody accepts through every stage: expired, with the earliest window offered', async () => {
    const r = await asap(patient2);
    expect(r.status).toBe(201);
    await sleep(8_000);
    const s = (await get(`/ordering/asap/${r.body.id}`, patient2)).body;
    expect(s.status).toBe('expired');
    expect(s.fallback.earliest_window).toMatchObject({ provider_id: expect.any(String), start: expect.any(String), end: expect.any(String) });
    expect((await post(`/ordering/asap/${r.body.id}/cancel`, patient2)).status).toBeGreaterThanOrEqual(400);
  });

  it('5. validation and ownership', async () => {
    expect(JSON.stringify((await asap(patient, { items: [] })).body)).toContain('asap_items_required');
    const r = await asap();
    expect((await get(`/ordering/asap/${r.body.id}`, patient2)).status).toBe(404);
    expect((await post(`/ordering/asap/${r.body.id}/cancel`, patient)).status).toBeLessThan(300);
    expect((await get(`/ordering/asap/${r.body.id}`, patient)).body.status).toBe('cancelled');
  });

  it('6. the stages are SystemConfig, not code', async () => {
    await stack.db.collection('system_configs').updateOne({ key: 'ordering_asap_stages' }, { $set: { value: [{ radius_km: 10, timeout_seconds: 600 }] } });
    const r = await asap(patient2);
    expect(r.body).toMatchObject({ radius_km: 10, stage: 1 });
    await post(`/ordering/asap/${r.body.id}/cancel`, patient2);
    await stack.db.collection('system_configs').updateOne({ key: 'ordering_asap_stages' }, { $set: { value: [{ radius_km: 3, timeout_seconds: 2 }, { radius_km: 5, timeout_seconds: 2 }, { radius_km: 8, timeout_seconds: 2 }] } });
  });

  it('7. a photo order that cannot be read confidently becomes a broadcast for priced offers', async () => {
    expect(JSON.stringify((await post('/ordering/photo-order', patient, { service_kind: 'lab', ...CENTER, payer: 'cash' })).body)).toContain('photo_upload_required');
    expect((await post('/ordering/photo-order', patient2, { service_kind: 'lab', upload_id: 'up-m4', ...CENTER, payer: 'cash' })).status).toBe(404); // not their upload
    await stack.db.collection('system_configs').updateOne({ key: 'ordering_asap_stages' }, { $set: { value: [{ radius_km: 10, timeout_seconds: 600 }] } });
    const r = await post('/ordering/photo-order', patient, { service_kind: 'lab', upload_id: 'up-m4', ...CENTER, payer: 'cash' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: 'awaiting_offers', items_unconfirmed: true });
    expect(r.body.providers_notified).toBeGreaterThanOrEqual(3);
    const id = r.body.id;

    const offer = (who: string, price: number) => post(`/provider/ordering/broadcasts/${id}/offer`, providerToken(who), { items: [{ name: 'Complete blood count', price }], note: 'confirmed' });
    expect((await offer('lab-m4-near', 80)).status).toBeLessThan(300);
    expect((await offer('lab-m4-mid', 55)).status).toBeLessThan(300);
    expect((await offer('lab-m4-mid', 50)).status).toBeLessThan(300); // replaces its own first offer
    const offers = rows((await get(`/ordering/photo-order/${id}/offers`, patient)).body);
    expect(offers).toHaveLength(2);
    expect(offers.map((o: any) => o.total)).toEqual([50, 80]);
    expect(JSON.stringify(offers)).not.toContain('+966500000777');
    expect(offers[0]).toMatchObject({ provider_id: 'lab-m4-mid' });
    expect((await get(`/ordering/photo-order/${id}/offers`, patient2)).status).toBe(404);

    const accept = await post(`/ordering/photo-order/${id}/offers/${offers[0].id}/accept`, patient);
    expect(accept.status).toBe(201);
    expect(accept.body.booking_id).toBeTruthy();
    expect((await post(`/ordering/photo-order/${id}/offers/${offers[1].id}/accept`, patient)).status).toBe(409);
    // late offers are refused once an offer was accepted
    expect((await offer('lab-m4-near', 60)).status).toBeGreaterThanOrEqual(400);
  });
});
