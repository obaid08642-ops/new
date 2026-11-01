import { BadRequestException } from '@nestjs/common';

/**
 * The one state machine of a reimbursement claim (`insurance_claims`). Every route that moves a claim goes through `nextClaimStatus`:
 *   patient   POST /insurance/claims/submit                       -> pending
 *   facility  POST /claims/:id/approve | reject | resubmit        -> approved | rejected | pending   (status only, no money)
 *   admin     POST /admin/insurance/claims/:id/decide             -> reimbursed (the only step that moves money) | rejected
 * Before this the facility could reject or resubmit a claim in any state (even one already reimbursed) and the admin could decide
 * only a claim the facility had not touched.
 */
export type ClaimAction = 'facility_approve' | 'facility_reject' | 'facility_resubmit' | 'reimburse' | 'admin_reject';

export const CLAIM_TRANSITIONS: Record<ClaimAction, { from: readonly string[]; to: string }> = {
  facility_approve: { from: ['pending', 'resubmitted'], to: 'approved' },
  facility_reject: { from: ['pending', 'resubmitted', 'approved'], to: 'rejected' },
  facility_resubmit: { from: ['rejected'], to: 'pending' },
  reimburse: { from: ['pending', 'approved'], to: 'reimbursed' },
  admin_reject: { from: ['pending', 'approved'], to: 'rejected' },
};

/** The status a claim moves to, or a 400 `invalid_claim_status:<current>` when the action does not apply to its current status. */
export function nextClaimStatus(action: ClaimAction, current: unknown): string {
  const rule = CLAIM_TRANSITIONS[action];
  const status = String(current ?? '');
  if (!rule.from.includes(status)) throw new BadRequestException(`invalid_claim_status:${status}`);
  return rule.to;
}
