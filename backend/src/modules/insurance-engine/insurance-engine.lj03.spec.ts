import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { InsuranceFlowService } from './insurance-engine.module';

const USER = { id: 'lab-account-1', role: 'lab' };

function setup(opts: { booking?: any; request?: any; policy?: any } = {}) {
  const service: any = Object.create(InsuranceFlowService.prototype);
  const created: any[] = [];
  const updates: any[] = [];
  const bookingModel = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(opts.booking ?? null) }) };
  service.bookingModel = jest.fn().mockReturnValue({ kind: 'lab', model: bookingModel });
  service.requests = {
    findOne: jest.fn().mockResolvedValue(opts.request ?? null),
    create: jest.fn().mockImplementation(async (doc: any) => {
      const row = { id: 'req-1', state: 'PENDING_PROVIDER_REVIEW', ...doc };
      created.push(doc);
      return { ...row, toObject: () => row };
    }),
    updateOne: jest.fn().mockImplementation(async (...args: any[]) => { updates.push(args); return {}; }),
  };
  service.patients = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(opts.policy === null ? null : { insurance: opts.policy ?? { company_id: 'c-1' } }) }) };
  service.events = { emit: jest.fn() };
  service.decide = jest.fn().mockImplementation(async (_u: any, id: string, body: any) => ({ id, state: body.decision === 'reject' ? 'REJECTED' : body.decision === 'approve_partial' ? 'COPAY_PENDING' : 'APPROVED_FULL', copay_amount: 0, ...body }));
  return { service, created, updates, bookingModel };
}

const LAB_BOOKING = { id: 'lab-b1', patient_id: 'patient-1', provider_account_id: 'lab-account-1', total: 300, service_type: 'lab' };

describe('InsuranceFlowService.providerDecideBooking (LJ-03)', () => {
  it('creates the request from the booking and maps full approval', async () => {
    const { service, created } = setup({ booking: LAB_BOOKING, policy: { company_id: 'c-1' } });

    const result = await service.providerDecideBooking(USER, 'lab', 'lab-b1', { decision: 'approved' });

    expect(created[0]).toMatchObject({ patient_id: 'patient-1', provider_id: 'lab-account-1', booking_kind: 'lab', price: 300 });
    expect(service.decide).toHaveBeenCalledWith(USER, 'req-1', { decision: 'approve_full' });
    expect(result.state).toBe('APPROVED_FULL');
  });

  it('turns a copay amount into a partial approval with a server-computed percent', async () => {
    const { service } = setup({ booking: LAB_BOOKING });

    await service.providerDecideBooking(USER, 'lab', 'lab-b1', { decision: 'partial', totalCopay: 90, reason: 'some items excluded' });

    expect(service.decide).toHaveBeenCalledWith(USER, 'req-1', { decision: 'approve_partial', copay_percent: 30 });
  });

  it('requires a rejection reason and validates the decision value', async () => {
    const { service } = setup({ booking: LAB_BOOKING });
    await expect(service.providerDecideBooking(USER, 'lab', 'lab-b1', { decision: 'rejected' })).rejects.toThrow(BadRequestException);
    await expect(service.providerDecideBooking(USER, 'lab', 'lab-b1', { decision: 'maybe' })).rejects.toThrow(BadRequestException);
  });

  it('refuses a provider that does not own the booking', async () => {
    const { service } = setup({ booking: LAB_BOOKING });
    await expect(service.providerDecideBooking({ id: 'other-lab', role: 'lab' }, 'lab', 'lab-b1', { decision: 'approved' }))
      .rejects.toThrow(ForbiddenException);
  });

  it('requires a patient policy before opening a request', async () => {
    const { service } = setup({ booking: LAB_BOOKING, policy: null });
    await expect(service.providerDecideBooking(USER, 'lab', 'lab-b1', { decision: 'approved' }))
      .rejects.toThrow(new BadRequestException('NO_INSURANCE_POLICY'));
  });

  it('returns the existing decided request without re-deciding', async () => {
    const { service } = setup({ booking: LAB_BOOKING, request: { id: 'req-9', state: 'COPAY_PAID', toObject: () => ({ id: 'req-9', state: 'COPAY_PAID' }) } });
    const result = await service.providerDecideBooking(USER, 'lab', 'lab-b1', { decision: 'approved' });
    expect(service.decide).not.toHaveBeenCalled();
    expect(result.state).toBe('COPAY_PAID');
  });
});

describe('confirmServiceBooking projects a paid lab booking to CONFIRMED (LJ-03)', () => {
  it('moves a lab booking to CONFIRMED after copay payment', async () => {
    const updateOne = jest.fn().mockResolvedValue({});
    const service: any = Object.create(InsuranceFlowService.prototype);
    service.bookingModel = jest.fn().mockReturnValue({ kind: 'lab', model: { updateOne } });

    await service.confirmServiceBooking({ booking_kind: 'lab', booking_id: 'lab-b1' });

    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ id: { $eq: 'lab-b1' } }),
      expect.objectContaining({ $set: expect.objectContaining({ state: 'CONFIRMED', insurance_status: 'approved' }) }),
    );
  });
});

/**
 * F2: POST /insurance/save-policy is served here (the strict duplicate in the
 * insurance module was removed). The behaviour the old spec asserted is kept.
 */
describe('InsuranceFlowService.savePolicy (F2 canonical handler)', () => {
  const setupSave = () => {
    const service: any = Object.create(InsuranceFlowService.prototype);
    const updates: any[] = [];
    service.companies = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'c-bupa', code: 'bupa', name_ar: 'بوبا', is_active: true }),
      }),
    };
    service.patients = {
      updateOne: jest.fn().mockImplementation(async (...args: any[]) => { updates.push(args); return {}; }),
    };
    return { service, updates };
  };

  it('saves the policy on the patient profile and never trusts a client "verified"', async () => {
    const { service, updates } = setupSave();
    const res = await service.savePolicy(
      { id: 'p1' },
      {
        company_id: 'bupa',
        policy_number: 'BPA-1111',
        network: 'gold',
        plan_class: 'A',
        expiry_date: '2027-12-31',
        member_name: 'Ahmed',
        national_id: '11111',
        verified: true,
      },
    );

    expect(res.ok).toBe(true);
    const [, update] = updates[0];
    // Verification is a server-side decision, never the client's.
    expect(update.$set.insurance.policy_number).toBe('BPA-1111');
    expect(update.$set.insurance.verified).toBe(false);
    expect(update.$set.insurance.member_name).toBe('Ahmed');
    expect(update.$set.insurance.expiry_date).toBe('2027-12-31');
  });
});
