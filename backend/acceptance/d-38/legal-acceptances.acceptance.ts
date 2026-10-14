// ACCEPTANCE — D-38 legal texts and acceptances (owner decision 2026-10-08 item 36; Queue C D-38), backend
// part. Written by the reviewer before the work; the implementing agent makes it pass and may not edit it
// (nor live-server.ts next to it). The web/app part is in patient-web/acceptance/d-38.
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis; the JWT secret
// and the test password are generated per run.
//
// Required
//   1. GET /legal/pending lists only the policies that apply to the caller: `applies_to` contains `all`
//      or the caller's own side (`patient` for patients; `provider` for provider accounts, whatever their
//      provider type). A provider is never asked to accept the patient terms, and a patient never the
//      provider agreement.
//   2. Sign-up (POST /auth/register, patient contract) records an acceptance of `patient_terms` and
//      `privacy_policy` in `legal_acceptances` (user_id, policy_key, version = the current version,
//      timestamp). Sign-up without both is refused (400) and creates no account; a consent naming an
//      unknown policy or a version that is not the current one is refused (400).
//   3. The first online (video) consultation needs `telehealth_consent`: booking a video consultation
//      before accepting it is refused with `telehealth_consent_required`; after POST
//      /legal/accept/telehealth_consent the booking goes through, and the acceptance row carries the
//      version, the time and the device.
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const MIN = 60_000;
const ALL_DAY = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '00:00', close: '00:00' }));
const policy = (key: string, applies_to: string[], requires_acceptance = true) => ({
  key, title_ar: key, title_en: key, content_ar: `نص ${key}`, content_en: `text of ${key}`, version: '1.0',
  effective_date: new Date(), last_updated: new Date(), requires_acceptance, applies_to, change_log: [],
});

describe('D-38: each user accepts the texts that apply to them, recorded with version, time and device', () => {
  const stack = new LiveStack();
  let patient = '';
  const PASSWORD = randomBytes(10).toString('hex');
  const keysOf = (body: any) => (Array.isArray(body) ? body : body?.data ?? []).map((p: any) => p.key).sort();

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('legal_policies').insertMany([
        policy('patient_terms', ['patient']),
        policy('privacy_policy', ['all']),
        policy('provider_agreement', ['provider']),
        policy('telehealth_consent', ['patient']),
        policy('refund_policy', ['all'], false),
      ]);
      await db.collection('provider_accounts').insertOne({ id: 'prov-ph', provider_type: 'pharmacy', status: 'approved', email: 'ph@prov.test' });
      await db.collection('provider_profiles').insertOne({
        id: 'doc-tele', user_id: 'acc-doc-tele', account_id: 'acc-doc-tele', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved',
        name_ar: 'د. سارة', specialty: 'general', consultation_modes: ['video'], working_hours: ALL_DAY, price_online: 150,
      });
    });
    patient = await stack.patient('pat-legal');
  });
  afterAll(async () => { await stack.stop(); });

  it('a patient is asked only for the patient and shared texts', async () => {
    const r = await stack.call(0, 'GET', '/api/v1/legal/pending', patient);
    expect(r.status).toBe(200);
    expect(keysOf(r.body)).toEqual(['patient_terms', 'privacy_policy', 'telehealth_consent']);
  });

  it('a provider (any provider type) is asked only for the provider and shared texts', async () => {
    const pharmacy = new JwtService({ secret: JWT_SECRET }).sign({ id: 'prov-ph', sub: 'prov-ph', role: 'provider', provider_type: 'pharmacy', scope: 'provider' });
    const r = await stack.call(0, 'GET', '/api/v1/legal/pending', pharmacy);
    expect(r.status).toBe(200);
    expect(keysOf(r.body)).toEqual(['privacy_policy', 'provider_agreement']);
  });

  const register = (phone: string, consents: Array<{ policy_id: string; version: string }>) =>
    stack.call(0, 'POST', '/api/v1/auth/register', undefined, { name: 'Legal Tester', identifier: phone, password: PASSWORD, locale: 'ar', consents });

  it('sign-up without both patient texts, or with an unknown or old version, is refused and creates no account', async () => {
    const cases: Array<[string, Array<{ policy_id: string; version: string }>]> = [
      ['+966500000101', [{ policy_id: 'patient_terms', version: '1.0' }]],
      ['+966500000102', [{ policy_id: 'patient_terms', version: '1.0' }, { policy_id: 'privacy_policy', version: '0.9' }]],
      ['+966500000103', [{ policy_id: 'patient_terms', version: '1.0' }, { policy_id: 'privacy_policy', version: '1.0' }, { policy_id: 'made_up_policy', version: '1.0' }]],
    ];
    const wrong: string[] = [];
    for (const [phone, consents] of cases) {
      const r = await register(phone, consents);
      if (r.status !== 400) wrong.push(`${phone}: ${r.status}`);
      if (await stack.db.collection('users').findOne({ phone })) wrong.push(`${phone}: account created`);
    }
    expect(wrong).toEqual([]);
  });

  it('sign-up records acceptances of patient_terms and privacy_policy at their current version', async () => {
    const phone = '+966500000104';
    await register(phone, [{ policy_id: 'patient_terms', version: '1.0' }, { policy_id: 'privacy_policy', version: '1.0' }]);
    // The account is created before the OTP is sent; the OTP channel is not configured in this test.
    const user: any = await stack.db.collection('users').findOne({ phone });
    expect(user).toBeTruthy();
    const rows = await stack.db.collection('legal_acceptances').find({ user_id: user.id }).toArray();
    const got = rows.map((a: any) => `${a.policy_key}@${a.version}`).sort();
    expect(got).toEqual(['patient_terms@1.0', 'privacy_policy@1.0']);
    for (const a of rows) expect(a.timestamp).toBeTruthy();
  });

  it('the first video consultation needs telehealth_consent, then records it with version, time and device', async () => {
    const slot = new Date(Math.ceil((Date.now() + 2 * 86_400_000) / (30 * MIN)) * 30 * MIN).toISOString();
    const body = { doctor_id: 'doc-tele', service_type: 'video', slot_start: slot, payment_method: 'card' };
    const before = await stack.call(0, 'POST', '/api/v1/care/appointments', patient, body);
    expect([before.status, JSON.stringify(before.body)]).toEqual([expect.any(Number), expect.stringContaining('telehealth_consent_required')]);
    expect(before.status).toBeGreaterThanOrEqual(400);
    const res = await fetch(`${stack.servers[0].url}/api/v1/legal/accept/telehealth_consent`, {
      method: 'POST',
      headers: { authorization: `Bearer ${patient}`, 'content-type': 'application/json', 'x-device-id': 'device-legal-1', 'idempotency-key': `acc-${randomBytes(6).toString('hex')}` },
      body: '{}',
    });
    expect(res.status).toBeLessThan(300);
    const after = await stack.call(0, 'POST', '/api/v1/care/appointments', patient, body);
    expect([after.status, JSON.stringify(after.body).slice(0, 200)]).toEqual([expect.any(Number), expect.any(String)]);
    expect(after.status).toBeLessThan(300);
    const row: any = await stack.db.collection('legal_acceptances').findOne({ user_id: 'pat-legal', policy_key: 'telehealth_consent' });
    expect(row).toMatchObject({ version: '1.0', device: 'device-legal-1' });
    expect(row.timestamp).toBeTruthy();
  });
});
