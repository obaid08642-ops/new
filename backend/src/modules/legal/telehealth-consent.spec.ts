import { BadRequestException } from '@nestjs/common';
import { assertTelehealthConsent, hasTelehealthConsent } from './telehealth-consent';
import { LiveKitService } from '../livekit/livekit.service';

// D-38: one rule for every place an online consultation is booked or its call is started.
type Row = { user_id: string; policy_key: string; version: string };

function connection(policy: { version: string; requires_acceptance?: boolean } | null, rows: Row[]) {
  const matches = (q: any, a: Row) => {
    if (a.user_id !== q.user_id || a.policy_key !== q.policy_key) return false;
    if (typeof q.version === 'string') return a.version === q.version;
    return new RegExp(q.version.$regex).test(a.version);
  };
  return {
    collection: jest.fn((name: string) => ({
      findOne: jest.fn(async (q: any) => {
        if (name === 'legal_policies') return policy ? { key: 'telehealth_consent', ...policy } : null;
        if (name === 'legal_acceptances') return rows.find((a) => matches(q, a)) ?? null;
        return null;
      }),
    })),
  };
}

describe('D-38 telehealth consent rule', () => {
  it('nothing to accept when no telehealth_consent is published', async () => {
    await expect(hasTelehealthConsent(connection(null, []), 'p1')).resolves.toBe(true);
  });

  it('refuses before acceptance with telehealth_consent_required', async () => {
    await expect(assertTelehealthConsent(connection({ version: '1.0' }, []), 'p1')).rejects.toThrow(new BadRequestException('telehealth_consent_required'));
  });

  it('an acceptance holds for a later minor version of the same major (D-36)', async () => {
    const rows = [{ user_id: 'p1', policy_key: 'telehealth_consent', version: '1.0' }];
    await expect(hasTelehealthConsent(connection({ version: '1.2' }, rows), 'p1')).resolves.toBe(true);
  });

  it('a new major version asks again', async () => {
    const rows = [{ user_id: 'p1', policy_key: 'telehealth_consent', version: '1.3' }];
    await expect(hasTelehealthConsent(connection({ version: '2.0' }, rows), 'p1')).resolves.toBe(false);
    await expect(hasTelehealthConsent(connection({ version: '11.0' }, [{ ...rows[0], version: '1.0' }]), 'p1')).resolves.toBe(false);
  });

  it('another user\'s acceptance does not count', async () => {
    const rows = [{ user_id: 'p2', policy_key: 'telehealth_consent', version: '1.0' }];
    await expect(hasTelehealthConsent(connection({ version: '1.0' }, rows), 'p1')).resolves.toBe(false);
  });
});

describe('D-38 the call token needs the consent on the patient side', () => {
  const slotNow = new Date().toISOString();
  const appt = { id: 'appt-1', patient_id: 'p1', doctor_user_id: 'd1', service_type: 'video', status: 'CONFIRMED', slot_start: slotNow };
  const service = (rows: Row[]) =>
    new LiveKitService({ findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(appt) })) } as any, connection({ version: '1.0' }, rows) as any, { emit: jest.fn() } as any);

  it('the patient without the consent is refused', async () => {
    await expect(service([]).issueBookingCallToken('appt-1', { id: 'p1' })).rejects.toThrow('telehealth_consent_required');
  });

  // past the consent rule a caller reaches the token step, which needs LiveKit (not configured in this test)
  const saved = { key: process.env.LIVEKIT_API_KEY, secret: process.env.LIVEKIT_API_SECRET };
  beforeEach(() => { delete process.env.LIVEKIT_API_KEY; delete process.env.LIVEKIT_API_SECRET; });
  afterAll(() => {
    if (saved.key !== undefined) process.env.LIVEKIT_API_KEY = saved.key;
    if (saved.secret !== undefined) process.env.LIVEKIT_API_SECRET = saved.secret;
  });

  it('the doctor is not asked for the patient\'s consent', async () => {
    await expect(service([]).issueBookingCallToken('appt-1', { id: 'd1' })).rejects.toThrow('LIVEKIT_NOT_CONFIGURED');
  });

  it('the patient who accepted gets past the rule', async () => {
    const rows = [{ user_id: 'p1', policy_key: 'telehealth_consent', version: '1.0' }];
    await expect(service(rows).issueBookingCallToken('appt-1', { id: 'p1' })).rejects.toThrow('LIVEKIT_NOT_CONFIGURED');
  });
});
