import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProviderProductionService } from './provider-production.module';

function createService({ account = { id: 'lab-1', provider_type: 'lab', status: 'approved' }, booking = { id: 'booking-1', provider_account_id: 'lab-1', patient_id: 'patient-1', state: 'PENDING_INSURANCE', pricing_snapshot: { total: 250 } } }: any = {}) {
  const providerAccounts = { findOne: jest.fn().mockResolvedValue(account) };
  const labBookings = { findOne: jest.fn().mockResolvedValue(booking), updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
  const conn = {
    collection: jest.fn((name: string) => name === 'provider_accounts' ? providerAccounts : name === 'labbookings' ? labBookings : { findOne: jest.fn(), updateOne: jest.fn() }),
  };
  return { service: new ProviderProductionService(conn as any), providerAccounts, labBookings };
}

describe('ProviderProductionService coverage decisions', () => {
  const labUser = { id: 'lab-1', role: 'lab' };

  it('rejects an operational action without an approved matching provider account', async () => {
    const { service } = createService({ account: null });
    await expect(service.labCoverageDecision(labUser, 'booking-1', { decision: 'APPROVED_FULL', decision_reference: 'INT-1' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires a manual reference for an approval and never accepts a client price amount', async () => {
    const { service, labBookings } = createService();
    await expect(service.labCoverageDecision(labUser, 'booking-1', { decision: 'APPROVED_FULL', copay_amount: 1, total: 1 }))
      .rejects.toBeInstanceOf(BadRequestException);
    await service.labCoverageDecision(labUser, 'booking-1', { decision: 'APPROVED_FULL', decision_reference: 'INT-REF-1', copay_amount: 1, total: 1 });
    const update = labBookings.updateOne.mock.calls[0][1];
    expect(update.$set.state).toBe('CONFIRMED');
    expect(update.$set.insurance_copay_amount).toBe(0);
    expect(update.$set.insurance_decision.price_snapshot).toBe(250);
    expect(update.$set.insurance_decision.decision_reference).toBe('INT-REF-1');
  });

  it('places a partial approval behind the co-pay gate and records its server-derived value', async () => {
    const { service, labBookings } = createService();
    await service.labCoverageDecision(labUser, 'booking-1', { decision: 'APPROVED_PARTIAL', decision_reference: 'INT-REF-2', copay_percent: 20 });
    const update = labBookings.updateOne.mock.calls[0][1];
    expect(update.$set.state).toBe('WAITING_COPAY');
    expect(update.$set.insurance_copay_amount).toBe(50);
    expect(update.$set.insurance_decision.copay_amount).toBe(50);
  });
});
