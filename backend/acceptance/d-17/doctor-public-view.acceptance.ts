// ACCEPTANCE — D-17 doctor public view: SCFHS licence and "verified"; never national ID, phone, email
// (owner decision 2026-10-06 item 17, issue #336; Queue C). Written by the reviewer before the work;
// the implementing agent makes it pass and may not edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
//
// Required for every public doctor read (anonymous): GET /care/doctors (list), GET /care/doctors/:id,
// GET /providers (list), GET /providers/:id:
//   - `scfhs_license_no` = the stored `scfhs_license_number`, and `verified: true` only when the admin
//     approved the doctor (medical_review_status approved AND license_verified);
//   - never: national_id, phone, email, iban, bank account name, licence documents, the account/user id.
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const SECRET_VALUES = ['1098765432', '+966511112222', 'dr.private@example.test', 'SA0380000000608010167519', 'Private Bank Name', 'docs/kyc/license.pdf', 'acc-doc-1'];

describe('D-17: the public doctor profile shows the licence and verified, nothing private', () => {
  const stack = new LiveStack();
  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('provider_profiles').insertOne({
        id: 'doc-prof-1', user_id: 'acc-doc-1', account_id: 'acc-doc-1', type: 'doctor', status: 'active', public_eligibility: true,
        medical_review_status: 'approved', license_verified: true, license_status: 'verified', scfhs_license_number: '18-RM-0012345',
        name_ar: 'د. سارة', name_en: 'Dr Sara', specialty: 'dermatology', consultation_modes: ['clinic'], city: 'Jeddah',
        national_id: '1098765432', phone: '+966511112222', email: 'dr.private@example.test', iban: 'SA0380000000608010167519',
        bank_account_name: 'Private Bank Name', license_documents: [{ type: 'license', url: 'docs/kyc/license.pdf' }],
      });
    });
  });
  afterAll(async () => { await stack.stop(); });

  it.each([
    ['/api/v1/care/doctors/doc-prof-1', false],
    ['/api/v1/providers/doc-prof-1', false],
    ['/api/v1/care/doctors', true],
    ['/api/v1/providers?type=doctor', true],
  ])('%s shows scfhs_license_no and verified', async (p, isList) => {
    const r = await stack.call(0, 'GET', p as string);
    expect(r.status).toBe(200);
    const list = Array.isArray(r.body) ? r.body : r.body?.items || r.body?.data || [];
    const d = isList ? list.find((x: any) => x.id === 'doc-prof-1') : (r.body?.data || r.body);
    expect(d).toBeTruthy();
    expect(d.scfhs_license_no).toBe('18-RM-0012345');
    expect(d.verified).toBe(true);
  });

  it.each(['/api/v1/care/doctors/doc-prof-1', '/api/v1/providers/doc-prof-1', '/api/v1/care/doctors', '/api/v1/providers?type=doctor'])('%s never carries private data', async (p) => {
    const s = JSON.stringify((await stack.call(0, 'GET', p)).body);
    expect(SECRET_VALUES.filter((v) => s.includes(v))).toEqual([]);
    expect(s).not.toMatch(/"national_id"|"iban"|"bank_account_name"|"license_documents"/);
  });

  it('a doctor not yet verified by the admin is not shown as verified', async () => {
    await stack.db.collection('provider_profiles').updateOne({ id: 'doc-prof-1' }, { $set: { license_verified: false } });
    const r = await stack.call(0, 'GET', '/api/v1/care/doctors/doc-prof-1');
    expect(r.status === 404 || r.body?.verified === false).toBe(true);
  });
});
