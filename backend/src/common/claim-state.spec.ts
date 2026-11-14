import { CLAIM_TRANSITIONS, nextClaimStatus, type ClaimAction } from './claim-state';

describe('the one claim state machine', () => {
  it.each<[ClaimAction, string, string]>([
    ['facility_approve', 'pending', 'approved'], ['facility_approve', 'resubmitted', 'approved'],
    ['facility_reject', 'pending', 'rejected'], ['facility_reject', 'approved', 'rejected'],
    ['facility_resubmit', 'rejected', 'pending'],
    ['reimburse', 'pending', 'reimbursed'], ['reimburse', 'approved', 'reimbursed'],
    ['admin_reject', 'pending', 'rejected'], ['admin_reject', 'approved', 'rejected'],
  ])('%s on a %s claim -> %s', (action, from, to) => {
    expect(nextClaimStatus(action, from)).toBe(to);
  });

  it('a reimbursed claim is final: nothing moves it (no second payout, no reset to pending)', () => {
    for (const action of Object.keys(CLAIM_TRANSITIONS) as ClaimAction[]) {
      expect(() => nextClaimStatus(action, 'reimbursed')).toThrow('invalid_claim_status:reimbursed');
    }
  });

  it('only a rejected claim can be resubmitted; only a pending or approved one can be paid', () => {
    expect(() => nextClaimStatus('facility_resubmit', 'pending')).toThrow('invalid_claim_status:pending');
    expect(() => nextClaimStatus('reimburse', 'rejected')).toThrow('invalid_claim_status:rejected');
    expect(() => nextClaimStatus('reimburse', undefined)).toThrow('invalid_claim_status:');
  });
});
