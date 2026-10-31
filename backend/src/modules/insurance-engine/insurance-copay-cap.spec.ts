import { InsuranceFlowService } from './insurance-engine.module';

/**
 * INS-CAP-1 (QA, reproduced at runtime 2026-10-29): the card says copay 20 %, cap 500 SAR; an 850 SAR scan; the centre decides approve_partial with copay_percent 70.
 * Expected copay 500 (the cap); actual was 595 (70 % of 850), stored and returned by /insurance/requests/:id/capabilities.
 */
function setup(card: Record<string, unknown> | null, price = 850) {
  const service: any = Object.create(InsuranceFlowService.prototype);
  const doc: any = { id: 'r1', patient_id: 'pat1', provider_id: 'prov1', state: 'PENDING_PROVIDER_REVIEW', price, history: [], save: jest.fn(async () => undefined), toObject() { return { ...this }; } };
  service.requests = { findOne: jest.fn(async () => doc) };
  service.patients = { findOne: jest.fn(() => ({ lean: async () => (card ? { insurance: card } : null) })) };
  service.events = { emit: jest.fn() };
  service.confirmServiceBooking = jest.fn();
  return { service, doc };
}
const provider = { id: 'prov1', role: 'lab' };

describe('insurance decide: the card copay cap is applied', () => {
  it('70 % of 850 = 595 is capped at the card cap 500', async () => {
    const { service, doc } = setup({ copay_percent: 20, copay_cap_sar: 500 });
    await service.decide(provider, 'r1', { decision: 'approve_partial', copay_percent: 70, approval_ref: 'A1' });
    expect(doc.copay_amount).toBe(500);
    expect(doc.copay_uncapped_amount).toBe(595);
    expect(doc.copay_cap_sar).toBe(500);
    expect(doc.copay_percent).toBe(59);       // 500 / 850, so the percentage and the amount agree
    expect((await service.capabilities({ id: 'pat1', role: 'patient' }, 'r1')).amount).toBe(500);
  });

  it('a provider copay_amount above the cap is capped the same way', async () => {
    const { service, doc } = setup({ copay_percent: 20, copay_cap_sar: 500 });
    await service.decide(provider, 'r1', { decision: 'approve_partial', copay_amount: 700, approval_ref: 'A1' });
    expect(doc.copay_amount).toBe(500);
  });

  it('a copay below the cap is left alone', async () => {
    const { service, doc } = setup({ copay_percent: 20, copay_cap_sar: 500 }, 1000);
    await service.decide(provider, 'r1', { decision: 'approve_partial', copay_percent: 30, approval_ref: 'A1' });
    expect(doc.copay_amount).toBe(300);
    expect(doc.copay_cap_sar).toBeUndefined();
  });

  it('no cap on the card, no card, or an invalid cap: the provider figure stands', async () => {
    for (const card of [{ copay_percent: 20 }, null, { copay_percent: 20, copay_cap_sar: 'x' }]) {
      const { service, doc } = setup(card as any);
      await service.decide(provider, 'r1', { decision: 'approve_partial', copay_percent: 70, approval_ref: 'A1' });
      expect(doc.copay_amount).toBe(595);
    }
  });

  it('a cap of 0 means the patient owes nothing', async () => {
    const { service, doc } = setup({ copay_percent: 20, copay_cap_sar: 0 });
    await service.decide(provider, 'r1', { decision: 'approve_partial', copay_percent: 70, approval_ref: 'A1' });
    expect(doc.copay_amount).toBe(0);
  });
});
