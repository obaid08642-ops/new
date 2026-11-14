import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RadiologyOpsService } from '../radiology/radiology.service';
import { ProviderProductionService } from './provider-production.module';

/** The booking coverage decision a lab / radiology / home-care provider records, and the radiology insurance status route. */
function productionWith(booking: any) {
  const updates: any[] = [];
  const svc: any = Object.create(ProviderProductionService.prototype);
  svc.assertApprovedOperationalAccount = async () => undefined;
  svc.conn = { collection: () => ({ findOne: async () => booking, updateOne: async (_f: any, u: any) => { updates.push(u); return {}; } }) };
  return { svc, updates };
}
const nurse = { id: 'nurse-1', role: 'nurse' };
const base = { id: 'b1', patient_id: 'p1', total: 200, payment_method: 'insurance' };

describe('coverage decision', () => {
  it('a rejection keeps the booking where it is (a state that exists) and mirrors insurance_status rejected', async () => {
    const { svc, updates } = productionWith({ ...base, state: 'PENDING_INSURANCE', provider_account_id: 'lab-1' });
    const res = await svc.labCoverageDecision({ id: 'lab-1', role: 'lab' }, 'b1', { decision: 'REJECTED', reason: 'not covered' });
    expect(res.next_state).toBe('PENDING_INSURANCE');
    expect(updates[0].$set.state).toBe('PENDING_INSURANCE');
    expect(JSON.stringify(updates[0])).not.toContain('INSURANCE_REJECTED');
    expect(updates[0].$set.insurance_status).toBe('rejected');
  });

  it('a nurse chosen at booking (PROVIDER_ASSIGNED, owner in provider_id) can record the decision', async () => {
    const { svc } = productionWith({ ...base, state: 'PROVIDER_ASSIGNED', provider_id: 'nurse-1' });
    const res = await svc.homecareCoverageDecision(nurse, 'b1', { decision: 'APPROVED_FULL', decision_reference: 'AP-1' });
    expect(res.next_state).toBe('CONFIRMED');
  });

  it('another nurse cannot decide a booking that names a different nurse', async () => {
    const { svc } = productionWith({ ...base, state: 'PROVIDER_ASSIGNED', provider_id: 'nurse-2' });
    await expect(svc.homecareCoverageDecision(nurse, 'b1', { decision: 'REJECTED', reason: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a lab still refuses PROVIDER_ASSIGNED (not a lab state)', async () => {
    const { svc } = productionWith({ ...base, state: 'PROVIDER_ASSIGNED', provider_account_id: 'lab-1' });
    await expect(svc.labCoverageDecision({ id: 'lab-1', role: 'lab' }, 'b1', { decision: 'REJECTED', reason: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('radiology insurance status route', () => {
  function radiology(booking: any) {
    const svc: any = Object.create(RadiologyOpsService.prototype);
    svc.findBooking = async () => booking;
    return svc;
  }
  it('a provider cannot approve (or part-approve) their own booking; that comes from the coverage decision', async () => {
    for (const status of ['approved', 'partial_approval', 'anything']) {
      const b: any = { insurance_status: 'pending', save: jest.fn() };
      await expect(radiology(b).updateInsuranceStatus('b1', { id: 'r1' }, status)).rejects.toThrow('insurance_approval_requires_coverage_decision');
      expect(b.save).not.toHaveBeenCalled();
      expect(b.insurance_status).toBe('pending');
    }
  });
  it('a rejection needs the reason the patient is shown, and is then saved', async () => {
    const b: any = { insurance_status: 'pending', save: jest.fn() };
    await expect(radiology(b).updateInsuranceStatus('b1', { id: 'r1' }, 'rejected')).rejects.toThrow('rejection_reason_required');
    await radiology(b).updateInsuranceStatus('b1', { id: 'r1' }, 'rejected', 'policy expired');
    expect(b).toMatchObject({ insurance_status: 'rejected', rejection_reason: 'policy expired' });
    expect(b.save).toHaveBeenCalled();
  });
});
