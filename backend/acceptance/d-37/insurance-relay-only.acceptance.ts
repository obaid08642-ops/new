// ACCEPTANCE — D-37 insurance is relay-only (owner decision 2026-10-08 item 35; Queue C D-37). Written by
// the reviewer before the work; the implementing agent makes it pass and may not edit it (nor
// live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis; the JWT secret
// is generated per run.
//
// Nabd+ never contacts an insurer. The provider asks for the approval in its own systems and records the
// outcome on the request (POST /insurance/requests/:id/decide). Required:
//   1. DecideDto: `approval_ref` is required for approve_full and approve_partial (400 without it) and is
//      stored on the request; approve_partial accepts `copay_amount` (SAR) as well as `copay_percent`;
//      `reason` stays required for reject.
//   2. The patient sees the outcome on GET /insurance/requests/:id: state, approval_ref, and on a partial
//      approval the co-pay amount.
//   3. The patient is notified on every decision, and the notification matches the outcome: a full or
//      partial approval is never announced as a rejection, and it points at the request.
//   4. One inbox for every provider type (pharmacy, doctor, laboratory, radiology, nursing): each sees only
//      the requests addressed to it (GET /insurance/requests/provider/queue), and a provider the request is
//      not addressed to gets 403 (or 404) on reading or deciding it.
//   5. Nothing implies a live insurer check: POST /insurance/nphies/eligibility is gone (404) or renamed,
//      and no patient-facing answer carries an `nphies*` field (`nphies_live`, `nphies_eligible`).
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const TYPES = ['pharmacy', 'doctor', 'laboratory', 'radiology', 'nursing'] as const;
const PAT = 'pat-ins-1';

describe('D-37: insurance requests are relayed to the provider, never checked with an insurer', () => {
  const stack = new LiveStack();
  let patient = '';
  const prov: Record<string, string> = {};
  const providerToken = (id: string, type: string) =>
    new JwtService({ secret: JWT_SECRET }).sign({ id, sub: id, role: 'provider', provider_type: type, scope: 'provider' });
  const request = (id: string, providerId: string, kind: string) => ({
    id, patient_id: PAT, patient_name: 'P', provider_id: providerId, booking_id: `bk-${id}`, booking_kind: kind,
    service_type: kind, price: 200, state: 'PENDING_PROVIDER_REVIEW',
    policy: { company_id: 'ins-co', plan_class: 'B', policy_number: 'POL-1' },
    history: [{ state: 'PENDING_PROVIDER_REVIEW', at: new Date(), by: PAT }], createdAt: new Date(), updatedAt: new Date(),
  });
  const decide = (token: string, id: string, body: unknown) => stack.call(0, 'POST', `/api/v1/insurance/requests/${id}/decide`, token, body);

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      const kinds: Record<string, string> = { pharmacy: 'pharmacy', doctor: 'consultation', laboratory: 'lab', radiology: 'radiology', nursing: 'nursing' };
      for (const t of TYPES) {
        await db.collection('provider_accounts').insertOne({ id: `prov-${t}`, provider_type: t, status: 'approved', email: `${t}@prov.test` });
      }
      await db.collection('insuranceservicerequests').insertMany([
        ...TYPES.map((t) => request(`ir-${t}`, `prov-${t}`, kinds[t])),
        request('ir-full', 'prov-pharmacy', 'pharmacy'),
        request('ir-part', 'prov-pharmacy', 'pharmacy'),
        request('ir-rej', 'prov-pharmacy', 'pharmacy'),
      ]);
    });
    patient = await stack.patient(PAT);
    for (const t of TYPES) prov[t] = providerToken(`prov-${t}`, t);
  });
  afterAll(async () => { await stack.stop(); });

  it('approve_full without approval_ref is refused; with it, the reference is stored and the patient sees it', async () => {
    expect((await decide(prov.pharmacy, 'ir-full', { decision: 'approve_full' })).status).toBe(400);
    const r = await decide(prov.pharmacy, 'ir-full', { decision: 'approve_full', approval_ref: 'APR-FULL-1' });
    expect(r.status).toBeLessThan(300);
    const seen = await stack.call(0, 'GET', '/api/v1/insurance/requests/ir-full', patient);
    expect(seen.status).toBe(200);
    expect(seen.body).toMatchObject({ state: 'APPROVED_FULL', approval_ref: 'APR-FULL-1' });
  });

  it('approve_partial takes approval_ref and a co-pay amount; the patient sees the co-pay', async () => {
    expect((await decide(prov.pharmacy, 'ir-part', { decision: 'approve_partial', copay_amount: 40 })).status).toBe(400);
    const r = await decide(prov.pharmacy, 'ir-part', { decision: 'approve_partial', copay_amount: 40, approval_ref: 'APR-PART-1' });
    expect([r.status, JSON.stringify(r.body).slice(0, 200)]).toEqual([expect.any(Number), expect.any(String)]);
    expect(r.status).toBeLessThan(300);
    const seen = await stack.call(0, 'GET', '/api/v1/insurance/requests/ir-part', patient);
    expect(seen.body).toMatchObject({ state: 'COPAY_PENDING', approval_ref: 'APR-PART-1', copay_amount: 40 });
  });

  it('reject still needs a reason', async () => {
    expect((await decide(prov.pharmacy, 'ir-rej', { decision: 'reject' })).status).toBe(400);
    expect((await decide(prov.pharmacy, 'ir-rej', { decision: 'reject', reason: 'not covered by class B' })).status).toBeLessThan(300);
  });

  it('the patient is notified of each decision, and an approval is never announced as a rejection', async () => {
    const notes: any[] = await stack.db.collection('notifications').find({ user_id: PAT }).toArray();
    const forReq = (id: string) => notes.find((n) => JSON.stringify(n).includes(id));
    const full = forReq('ir-full');
    const part = forReq('ir-part');
    const rej = forReq('ir-rej');
    expect({ full: !!full, part: !!part, rej: !!rej }).toEqual({ full: true, part: true, rej: true });
    expect(JSON.stringify(full)).not.toMatch(/reject/i);
    expect(JSON.stringify(part)).not.toMatch(/reject/i);
    expect(JSON.stringify(rej)).toMatch(/reject/i);
  });

  it('every provider type sees only its own requests in the shared inbox', async () => {
    const wrong: string[] = [];
    for (const t of TYPES) {
      const r = await stack.call(0, 'GET', '/api/v1/insurance/requests/provider/queue', prov[t]);
      const ids = (Array.isArray(r.body) ? r.body : r.body?.data ?? []).map((x: any) => x.id);
      if (r.status !== 200 || !ids.includes(`ir-${t}`)) wrong.push(`${t}: status ${r.status}, own request missing (${ids.join(',')})`);
      for (const o of TYPES) if (o !== t && ids.includes(`ir-${o}`)) wrong.push(`${t} sees ir-${o}`);
    }
    expect(wrong).toEqual([]);
  });

  it('a provider the request is not addressed to cannot read or decide it', async () => {
    const wrong: string[] = [];
    for (const t of TYPES) {
      const other = TYPES[(TYPES.indexOf(t) + 1) % TYPES.length];
      const read = await stack.call(0, 'GET', `/api/v1/insurance/requests/ir-${other}`, prov[t]);
      if (![403, 404].includes(read.status)) wrong.push(`${t} read ir-${other}: ${read.status}`);
      const d = await decide(prov[t], `ir-${other}`, { decision: 'reject', reason: 'not addressed to me' });
      if (![403, 404].includes(d.status)) wrong.push(`${t} decided ir-${other}: ${d.status}`);
    }
    expect(wrong).toEqual([]);
    expect((await stack.db.collection('insuranceservicerequests').findOne({ id: 'ir-doctor' }))?.state).toBe('PENDING_PROVIDER_REVIEW');
  });

  it('nothing implies a live insurer (NPHIES) check', async () => {
    const elig = await stack.call(0, 'POST', '/api/v1/insurance/nphies/eligibility', patient, { national_id: '1000000001', insurance_company_code: 'ins-co' });
    if (elig.status !== 404) expect(JSON.stringify(elig.body)).not.toMatch(/nphies/i);
    expect(elig.status === 404 || !/nphies/i.test(JSON.stringify(elig.body))).toBe(true);
    const mine = await stack.call(0, 'GET', '/api/v1/users/me/insurance', patient);
    expect(JSON.stringify(mine.body ?? '')).not.toMatch(/nphies/i);
  });
});
