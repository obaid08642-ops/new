// ACCEPTANCE — provider endpoints refuse a patient (provider-app audit, needs-review [backend] "a seeded PATIENT
// session gets 200 on this provider endpoint"). Written by the lead reviewer with the fix.
//
// Every GET below serves a provider screen. A signed-in PATIENT must get 403, not 200 with an empty or
// self-scoped answer. Control: a doctor still reaches the shared provider endpoints.
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from '../d-8/live-server';

jest.setTimeout(600_000);

const PROVIDER_GETS = [
  '/pharmacy/inventory/expiry',
  '/provider/stats/today', '/provider/settings/pricing', '/provider/wallet', '/provider/wallet/transactions',
  '/provider/ops/doctor/templates', '/provider/ops/doctor/blacklist', '/provider/ops/wallet/ledger',
  '/calls/provider/waiting-room',
  '/provider/facility/audit-logs', '/provider/facility/patients/active', '/provider/facility/calendar', '/provider/facility/subaccounts',
  '/provider/leave-requests',
  '/insurance/requests/provider/queue',
  '/provider/capabilities/lab-services',
  '/provider/nursing/supplies', '/provider/nursing/checklist',
  '/pharmacy/returns/provider/list',
  '/radiology/provider/inbox',
  '/provider/insurance-matrix', '/provider/reviews', '/provider/bank-account', '/provider/working-hours',
];

describe('provider endpoints refuse a patient', () => {
  const stack = new LiveStack();
  let patient = '';
  let doctor = '';

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1);
    patient = await stack.patient('pat-1');
    await stack.db.collection('users').updateOne({ id: 'doc-1' }, { $set: { id: 'doc-1', full_name: 'Test Doctor', role: 'doctor', active: true } }, { upsert: true });
    doctor = new JwtService({ secret: JWT_SECRET }).sign({ id: 'doc-1', sub: 'doc-1', role: 'doctor' });
  });
  afterAll(async () => { await stack.stop(); });

  it('a patient gets 403 on every provider endpoint', async () => {
    const open: string[] = [];
    for (const p of PROVIDER_GETS) {
      const r = await stack.call(0, 'GET', `/api/v1${p}`, patient);
      if (r.status !== 403) open.push(`${p} -> ${r.status}`);
    }
    expect(open).toEqual([]);
  });

  it('control: a provider-auth token (role provider, any provider_type, e.g. clinic) is not refused by role', async () => {
    const clinic = new JwtService({ secret: JWT_SECRET }).sign({ id: 'cl-1', sub: 'cl-1', role: 'provider', provider_type: 'clinic' });
    for (const p of ['/provider/wallet', '/provider/working-hours']) {
      const r = await stack.call(0, 'GET', `/api/v1${p}`, clinic);
      expect([p, r.status === 403]).toEqual([p, false]);
    }
  });

  it('control: a doctor is not refused by role on the shared provider endpoints', async () => {
    for (const p of ['/provider/wallet', '/provider/wallet/transactions', '/provider/reviews', '/provider/working-hours', '/provider/stats/today']) {
      const r = await stack.call(0, 'GET', `/api/v1${p}`, doctor);
      expect([p, r.status === 403]).toEqual([p, false]);
    }
  });
});
