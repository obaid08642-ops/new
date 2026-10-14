import { AppointmentsService } from './appointments.service';

// D-38: the first online (video) consultation needs telehealth_consent.
const MIN = 60_000;

function build(opts: { accepted: boolean }) {
  const policies = [{ key: 'telehealth_consent', version: '1.0', requires_acceptance: true, applies_to: ['patient'] }];
  const acceptances: any[] = opts.accepted
    ? [{ user_id: 'pat-legal', policy_key: 'telehealth_consent', version: '1.0', timestamp: new Date(), device: 'device-legal-1' }]
    : [];
  const connection: any = {
    collection: jest.fn((name: string) => {
      if (name === 'legal_policies') return { findOne: jest.fn().mockResolvedValue(policies[0]) };
      if (name === 'legal_acceptances') {
        return { findOne: jest.fn().mockImplementation(async (q: any) => acceptances.find((a) => a.user_id === q?.user_id && a.policy_key === q?.policy_key && a.version === q?.version) ?? null) };
      }
      return { findOne: jest.fn().mockResolvedValue(null) };
    }),
  };
  const apptDoc = (id: string) => ({ id, toObject: () => ({ id }) });
  const apptModel: any = {
    findOne: jest.fn().mockImplementation(async (q: any) => (q?.id ? apptDoc(q.id) : null)),
    create: jest.fn().mockImplementation(async (doc: any) => ({ id: 'appt-1', ...doc })),
  };
  const providerModel: any = {
    findOne: jest.fn().mockResolvedValue({ id: 'doc-tele', user_id: 'acc-doc-tele', type: 'doctor', status: 'active', consultation_modes: ['video'], price_online: 150 }),
  };
  const service = new AppointmentsService(
    apptModel, providerModel, connection, { emit: jest.fn() } as any,
    { announceCreated: jest.fn().mockResolvedValue({}) } as any, {} as any,
  );
  const slot = new Date(Math.ceil((Date.now() + 2 * 86_400_000) / (30 * MIN)) * 30 * MIN).toISOString();
  const body = { doctor_id: 'doc-tele', service_type: 'video', slot_start: slot, payment_method: 'card' } as any;
  return { service, body };
}

describe('D-38 video booking needs telehealth_consent', () => {
  it('refuses with telehealth_consent_required before acceptance', async () => {
    const { service, body } = build({ accepted: false });
    await expect(service.create({ id: 'pat-legal', role: 'patient' }, body)).rejects.toThrow('telehealth_consent_required');
  });

  it('books once the current telehealth_consent is accepted', async () => {
    const { service, body } = build({ accepted: true });
    await expect(service.create({ id: 'pat-legal', role: 'patient' }, body)).resolves.toMatchObject({ id: 'appt-1' });
  });
});
