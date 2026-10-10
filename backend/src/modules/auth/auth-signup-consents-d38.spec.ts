import { AuthService } from './auth.service';

// D-38: sign-up records acceptance of the current patient texts; anything else is refused
// with 400 and creates no account.
const SEED_POLICIES = [
  { key: 'patient_terms', version: '1.0', requires_acceptance: true, applies_to: ['patient'] },
  { key: 'privacy_policy', version: '1.0', requires_acceptance: true, applies_to: ['all'] },
  { key: 'provider_agreement', version: '1.0', requires_acceptance: true, applies_to: ['provider'] },
  { key: 'telehealth_consent', version: '1.0', requires_acceptance: true, applies_to: ['patient'] },
  { key: 'refund_policy', version: '1.0', requires_acceptance: false, applies_to: ['all'] },
];

function build() {
  const acceptances: any[] = [];
  const legal = {
    legal_policies: {
      find: jest.fn().mockImplementation((q: any) => ({
        toArray: jest.fn().mockResolvedValue(
          q?.key?.$in ? SEED_POLICIES.filter((p) => q.key.$in.includes(p.key)) : SEED_POLICIES,
        ),
      })),
    },
    legal_acceptances: { insertOne: jest.fn().mockImplementation(async (doc: any) => { acceptances.push(doc); return {}; }) },
  };
  const user = { id: 'user-legal-1', full_name: 'Legal Tester', phone: '+966500000104', role: 'patient', active: true };
  const userModel: any = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(user),
    model: { db: { collection: jest.fn((name: string) => (legal as any)[name]) } },
  };
  const patientModel: any = { create: jest.fn().mockResolvedValue({}) };
  const mail = { sendOtp: jest.fn(async () => ({ ok: true, provider: 'resend', fallback_used: false })) };
  const service = new AuthService(
    userModel, patientModel, { sign: jest.fn() } as any, { emit: jest.fn() } as any,
    { checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }) } as any,
    undefined, undefined, undefined, undefined, undefined, mail as any,
  );
  return { service, userModel, acceptances };
}

const register = (service: any, phone: string, consents: Array<{ policy_id: string; version: string }>) =>
  service.registerPatientContract({ name: 'Legal Tester', identifier: phone, password: 'long-enough-password', locale: 'ar', consents });

describe('D-38 sign-up records the current patient texts', () => {
  const statusOf = async (p: Promise<unknown>): Promise<number | string> => {
    try {
      await p;
      return 'resolved';
    } catch (e: any) {
      return typeof e?.getStatus === 'function' ? e.getStatus() : `threw ${e?.constructor?.name}`;
    }
  };

  it('refuses sign-up without both texts, with an old version, or with an unknown policy — creating no account', async () => {
    const { service, userModel } = build();
    const cases: Array<[string, Array<{ policy_id: string; version: string }>]> = [
      ['+966500000101', [{ policy_id: 'patient_terms', version: '1.0' }]],
      ['+966500000102', [{ policy_id: 'patient_terms', version: '1.0' }, { policy_id: 'privacy_policy', version: '0.9' }]],
      ['+966500000103', [{ policy_id: 'patient_terms', version: '1.0' }, { policy_id: 'privacy_policy', version: '1.0' }, { policy_id: 'made_up_policy', version: '1.0' }]],
    ];
    for (const [phone, consents] of cases) {
      expect(await statusOf(register(service, phone, consents))).toBe(400);
    }
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('records acceptances of patient_terms and privacy_policy at their current version', async () => {
    const { service, acceptances } = build();
    await expect(register(service, '+966500000104', [
      { policy_id: 'patient_terms', version: '1.0' },
      { policy_id: 'privacy_policy', version: '1.0' },
    ])).resolves.toEqual({ registered: true });
    expect(acceptances.map((a: any) => `${a.policy_key}@${a.version}`).sort()).toEqual(['patient_terms@1.0', 'privacy_policy@1.0']);
    for (const a of acceptances) {
      expect(a.user_id).toBe('user-legal-1');
      expect(a.timestamp).toBeTruthy();
    }
  });
});
