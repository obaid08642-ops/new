// ACCEPTANCE — Ordering model M8: instant consultation broadcast (docs/product/ORDERING_MODEL_2026-10-16.md phase M8;
// ORDERING_UX_SPEC §2.3). Written by the reviewer before the work; the implementing agent makes it pass and may not edit it
// (nor live-server.ts next to it). Backend part only; the "Instant consultation" button and waiting screen (M6) call these routes.
//
// Behaviour: a button at the top of a specialty broadcasts the request to the ONLINE doctors of that specialty. The first
// doctor to accept gets the visit; the others are told it is taken. If nobody accepts within the timeout the patient is offered
// the earliest slot or a refund. Nothing is charged before a doctor accepts. Reviewer decisions (owner can redirect): the
// timeout is SystemConfig `instant_consultation_timeout_seconds` (default 180); modes `video` or `audio`; one open request per
// patient at a time; a doctor can only accept while online in that specialty.
//
// Contract (under /api/v1):
//   PUT  /doctors/me/instant-availability  { available: boolean }   (doctor) turns "take instant consultations" on or off.
//   POST /consultations/instant            (patient) { specialty, mode: 'video'|'audio', family_member_id? }
//        → 201 { id, status: 'broadcasting', expires_at, doctors_notified: n, payment_status: 'not_charged' }
//        400 `instant_specialty_required`, `instant_mode_invalid`; 409 `instant_request_open` (one at a time);
//        409 `instant_no_online_doctors` with { earliest_slot: { doctor_id, starts_at } | null, alternatives: [...] } when nobody is online.
//   GET  /consultations/instant/:id        (the patient) → { id, status: 'broadcasting'|'accepted'|'expired'|'cancelled', expires_at,
//        seconds_left, accepted_by?, appointment_id?, fallback?: { options: ['earliest_slot','refund'], earliest_slot } }
//   POST /consultations/instant/:id/cancel (the patient) → status `cancelled`, nothing charged.
//   GET  /doctors/instant-requests         (doctor) → open requests of the doctor's specialty while they are online; none while offline.
//   POST /doctors/instant-requests/:id/accept  (doctor) → 200 { appointment_id } for the first; a second doctor → 409 `instant_already_taken`;
//        an offline doctor or one of another specialty → 403.
//   POST /doctors/instant-requests/:id/decline (doctor) → the request stays open for the others.
//   An accepted request creates a normal appointment (`appointments`, service_type `consultation`, instant: true) for the patient and the doctor.
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const PATIENT = 'pat-m8';
const PATIENT_2 = 'pat-m8-two';
const DOCS = [
  { id: 'doc-m8-cardio-1', specialty: 'cardiology' },
  { id: 'doc-m8-cardio-2', specialty: 'cardiology' },
  { id: 'doc-m8-derm', specialty: 'dermatology' },
];
const sign = (payload: Record<string, unknown>) => new JwtService({ secret: JWT_SECRET }).sign({ ...payload });
const providerToken = (id: string) => sign({ id, sub: id, role: 'provider', provider_type: 'doctor', scope: 'provider' });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('M8 instant consultation', () => {
  const stack = new LiveStack();
  let patient = '';
  let patient2 = '';
  const doctor: Record<string, string> = {};

  const post = (path: string, token: string, body: unknown = {}) => stack.call(0, 'POST', `/api/v1${path}`, token, body);
  const get = (path: string, token: string) => stack.call(0, 'GET', `/api/v1${path}`, token);
  const online = (id: string, available = true) => stack.call(0, 'PUT', '/api/v1/doctors/me/instant-availability', doctor[id], { available });
  const open = (body: any) => (Array.isArray(body) ? body : body?.items || body?.requests || []);

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      for (const d of DOCS) {
        await db.collection('users').insertOne({ id: d.id, full_name: `Dr ${d.id}`, role: 'doctor', active: true });
        await db.collection('provider_accounts').insertOne({ id: d.id, provider_type: 'doctor', status: 'approved', availability: {} });
        await db.collection('provider_profiles').insertOne({
          id: d.id, user_id: d.id, account_id: d.id, type: 'doctor', provider_type: 'doctor', status: 'active', public_eligibility: true,
          medical_review_status: 'approved', specialty: d.specialty, name_ar: `طبيب ${d.id}`, price_video: 150, consultation_modes: ['video', 'audio'],
        });
      }
    }, { /* the timeout is read from SystemConfig per request, seeded below */ });
    await stack.db.collection('system_configs').updateOne({ key: 'instant_consultation_timeout_seconds' }, { $set: { key: 'instant_consultation_timeout_seconds', value: 4 } }, { upsert: true });
    patient = await stack.patient(PATIENT);
    patient2 = await stack.patient(PATIENT_2);
    for (const d of DOCS) doctor[d.id] = providerToken(d.id);
  });
  afterAll(async () => { await stack.stop(); });

  it('1. nobody online: 409 with the earliest slot and alternatives, nothing created', async () => {
    const r = await post('/consultations/instant', patient, { specialty: 'cardiology', mode: 'video' });
    expect(r.status).toBe(409);
    expect(JSON.stringify(r.body)).toContain('instant_no_online_doctors');
    expect(r.body).toHaveProperty('earliest_slot');
    expect(await stack.db.collection('instant_consultations').countDocuments({ patient_id: PATIENT })).toBe(0);
  });

  it('2. validation: specialty and mode are required', async () => {
    expect(JSON.stringify((await post('/consultations/instant', patient, { mode: 'video' })).body)).toContain('instant_specialty_required');
    expect(JSON.stringify((await post('/consultations/instant', patient, { specialty: 'cardiology', mode: 'walk' })).body)).toContain('instant_mode_invalid');
    expect((await post('/consultations/instant', doctor['doc-m8-cardio-1'], { specialty: 'cardiology', mode: 'video' })).status).toBe(403);
  });

  it('3. broadcast reaches only online doctors of the specialty; offline and other specialties see nothing', async () => {
    expect((await online('doc-m8-cardio-1')).status).toBeLessThan(300);
    expect((await online('doc-m8-cardio-2')).status).toBeLessThan(300);
    expect((await online('doc-m8-derm')).status).toBeLessThan(300);
    expect((await online('doc-m8-cardio-2', false)).status).toBeLessThan(300);
    const r = await post('/consultations/instant', patient, { specialty: 'cardiology', mode: 'video' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: 'broadcasting', doctors_notified: 1, payment_status: 'not_charged' });
    const id = r.body.id;
    expect(open((await get('/doctors/instant-requests', doctor['doc-m8-cardio-1'])).body).map((x: any) => x.id)).toContain(id);
    expect(open((await get('/doctors/instant-requests', doctor['doc-m8-cardio-2'])).body)).toHaveLength(0); // offline
    expect(open((await get('/doctors/instant-requests', doctor['doc-m8-derm'])).body)).toHaveLength(0); // other specialty
    // one open request per patient
    const dup = await post('/consultations/instant', patient, { specialty: 'cardiology', mode: 'video' });
    expect(dup.status).toBe(409);
    expect(JSON.stringify(dup.body)).toContain('instant_request_open');
    // an offline doctor and another specialty cannot accept
    expect((await post(`/doctors/instant-requests/${id}/accept`, doctor['doc-m8-cardio-2'])).status).toBe(403);
    expect((await post(`/doctors/instant-requests/${id}/accept`, doctor['doc-m8-derm'])).status).toBe(403);
    await post(`/consultations/instant/${id}/cancel`, patient);
  });

  it('4. the first doctor to accept wins; the second is told it is taken; an appointment is created', async () => {
    await online('doc-m8-cardio-2', true);
    const r = await post('/consultations/instant', patient, { specialty: 'cardiology', mode: 'video' });
    expect(r.status).toBe(201);
    expect(r.body.doctors_notified).toBe(2);
    const id = r.body.id;
    const results = await Promise.all([
      post(`/doctors/instant-requests/${id}/accept`, doctor['doc-m8-cardio-1']),
      post(`/doctors/instant-requests/${id}/accept`, doctor['doc-m8-cardio-2']),
    ]);
    const won = results.filter((x) => x.status === 200);
    const lost = results.filter((x) => x.status === 409);
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(JSON.stringify(lost[0].body)).toContain('instant_already_taken');
    const state = (await get(`/consultations/instant/${id}`, patient)).body;
    expect(state).toMatchObject({ status: 'accepted', appointment_id: won[0].body.appointment_id });
    const appt = await stack.db.collection('appointments').findOne({ id: won[0].body.appointment_id });
    expect(appt).toMatchObject({ patient_id: PATIENT, service_type: 'consultation', instant: true });
    expect([DOCS[0].id, DOCS[1].id]).toContain(appt?.doctor_user_id || appt?.provider_id);
    // the request is closed for everyone
    expect(open((await get('/doctors/instant-requests', doctor['doc-m8-cardio-1'])).body).map((x: any) => x.id)).not.toContain(id);
    // another patient's request is not visible to this patient
    expect((await get(`/consultations/instant/${id}`, patient2)).status).toBe(404);
  });

  it('5. a decline keeps the request open for the others', async () => {
    const r = await post('/consultations/instant', patient2, { specialty: 'cardiology', mode: 'audio' });
    expect(r.status).toBe(201);
    const id = r.body.id;
    expect((await post(`/doctors/instant-requests/${id}/decline`, doctor['doc-m8-cardio-1'])).status).toBeLessThan(300);
    expect(open((await get('/doctors/instant-requests', doctor['doc-m8-cardio-1'])).body).map((x: any) => x.id)).not.toContain(id);
    expect(open((await get('/doctors/instant-requests', doctor['doc-m8-cardio-2'])).body).map((x: any) => x.id)).toContain(id);
    expect((await get(`/consultations/instant/${id}`, patient2)).body.status).toBe('broadcasting');
    // nobody accepts: after the timeout the patient is offered the earliest slot or a refund; nothing was charged
    await sleep(6_000);
    const state = (await get(`/consultations/instant/${id}`, patient2)).body;
    expect(state.status).toBe('expired');
    expect(state.fallback.options).toEqual(expect.arrayContaining(['earliest_slot', 'refund']));
    expect(state.payment_status ?? 'not_charged').toBe('not_charged');
    expect((await post(`/doctors/instant-requests/${id}/accept`, doctor['doc-m8-cardio-2'])).status).toBeGreaterThanOrEqual(400);
    // a new request is allowed once the old one is closed
    const again = await post('/consultations/instant', patient2, { specialty: 'cardiology', mode: 'audio' });
    expect(again.status).toBe(201);
    expect((await post(`/consultations/instant/${again.body.id}/cancel`, patient2)).status).toBeLessThan(300);
    expect((await get(`/consultations/instant/${again.body.id}`, patient2)).body.status).toBe('cancelled');
  });

  it('6. the timeout is read from SystemConfig, not fixed in code', async () => {
    await stack.db.collection('system_configs').updateOne({ key: 'instant_consultation_timeout_seconds' }, { $set: { value: 600 } });
    const r = await post('/consultations/instant', patient2, { specialty: 'cardiology', mode: 'video' });
    expect(r.status).toBe(201);
    const left = (await get(`/consultations/instant/${r.body.id}`, patient2)).body.seconds_left;
    expect(left).toBeGreaterThan(300);
    await post(`/consultations/instant/${r.body.id}/cancel`, patient2);
  });
});
