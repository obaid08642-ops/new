// ACCEPTANCE — D-19 a lab-result push opens the result (owner decision 2026-10-06 item 19, issue #338;
// Queue C). Written by the reviewer before the work; the implementing agent makes it pass and may not
// edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis. The lab
// publishes the result through the real POST /lab-results.
//
// Required
//   - The patient's notification for a ready result points at that result: `action.route` contains the
//     result id, and its `action.payload` (or params) carries { result_id } plus a "discuss with a doctor"
//     follow-up: { discuss: { route } } leading to consultations.
//   - The patient can read the result the link opens: GET /api/v1/lab-results/:id answers 200 for the
//     owner (today: 403 because of the class-level roles), 403 or 404 for another patient.
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

describe('D-19: the lab-result notification opens a result the patient can read', () => {
  const stack = new LiveStack();
  let patient = '';
  let other = '';
  let lab = '';
  let resultId = '';

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('provider_accounts').insertOne({ id: 'lab-1', provider_type: 'laboratory', status: 'approved', email: 'lab@lab.test' });
      await db.collection('labbookings').insertOne({
        id: 'lb-1', tracking_id: 'LB-0001', patient_id: 'pat-1', patient_name: 'P', provider_account_id: 'lab-1', state: 'RESULT_UPLOADED', state_history: [],
        items: [{ service_id: 'cbc', name_ar: 'صورة دم', name_en: 'CBC', price: 80 }], total: 80, scheduled_at: new Date(), createdAt: new Date(), updatedAt: new Date(),
      });
    });
    patient = await stack.patient('pat-1');
    other = await stack.patient('pat-2');
    lab = new JwtService({ secret: JWT_SECRET }).sign({ id: 'lab-1', sub: 'lab-1', role: 'provider', provider_type: 'laboratory', scope: 'provider' });
    const r = await stack.call(0, 'POST', '/api/v1/lab-results', lab, { booking_id: 'lb-1', type: 'STRUCTURED', entries: [{ name: 'HGB', value: '13.5', unit: 'g/dL', ref_low: 12, ref_high: 16 }] });
    expect(r.status).toBeLessThan(300);
    resultId = r.body?.id;
    await new Promise((res) => setTimeout(res, 1500));
  });
  afterAll(async () => { await stack.stop(); });

  it('the notification points at this result and offers "discuss with a doctor"', async () => {
    const n: any = await stack.db.collection('notifications').findOne({ user_id: 'pat-1', title_key: { $regex: 'lab_result' } });
    expect(n).toBeTruthy();
    expect(String(n.action?.route)).toContain(resultId);
    const extra = JSON.stringify({ payload: n.action?.payload, params: n.params });
    expect(extra).toContain(resultId);
    expect(extra).toMatch(/discuss/);
  });

  it('the owner can read the result the link opens; another patient cannot', async () => {
    const mine = await stack.call(0, 'GET', `/api/v1/lab-results/${resultId}`, patient);
    expect(mine.status).toBe(200);
    expect(JSON.stringify(mine.body)).toContain('HGB');
    expect([403, 404]).toContain((await stack.call(0, 'GET', `/api/v1/lab-results/${resultId}`, other)).status);
  });
});
