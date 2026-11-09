import { buildIssueReferralBody, ISSUE_REFERRAL_URL } from '../issueReferral';

const A = '3f2b8c1e-7a4d-4e0b-9c55-0a1b2c3d4e5f';
const P = '7d9e1a20-1111-4222-8333-444455556666';
const D = 'c0ffee00-aaaa-4bbb-8ccc-ddddeeeeffff';

describe('PT-05 issue referral body', () => {
  it('posts to the engine route', () => {
    expect(ISSUE_REFERRAL_URL).toBe('/provider/doctor-referrals/issue-referrals-and-prescription');
  });

  it('builds the dto the backend validates (uuid ids, lab tests, scans, trimmed notes)', () => {
    expect(buildIssueReferralBody({ appointmentId: A, patientId: P, doctorId: D, labTests: ['cbc'], radScans: ['xr'], homeCareNotes: ' fast 8h ' }))
      .toEqual({ body: { appointmentId: A, patientId: P, doctorId: D, labTests: ['cbc'], radScans: ['xr'], homeCareNotes: 'fast 8h' } });
  });

  it('omits empty notes and accepts notes alone', () => {
    const r: any = buildIssueReferralBody({ appointmentId: A, patientId: P, doctorId: D, labTests: ['cbc'], radScans: [], homeCareNotes: '  ' });
    expect('homeCareNotes' in r.body).toBe(false);
    expect('body' in buildIssueReferralBody({ appointmentId: A, patientId: P, doctorId: D, labTests: [], radScans: [], homeCareNotes: 'rest' })).toBe(true);
  });

  it('names what is missing instead of sending', () => {
    const base = { appointmentId: A, patientId: P, doctorId: D, labTests: ['cbc'], radScans: [], homeCareNotes: '' };
    expect(buildIssueReferralBody({ ...base, appointmentId: undefined })).toEqual({ missing: 'visit' });
    expect(buildIssueReferralBody({ ...base, patientId: null })).toEqual({ missing: 'patient' });
    expect(buildIssueReferralBody({ ...base, doctorId: '' })).toEqual({ missing: 'doctor' });
    expect(buildIssueReferralBody({ ...base, labTests: [] })).toEqual({ missing: 'items' });
  });
});
