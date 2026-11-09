import { BadRequestException } from '@nestjs/common';
import { registerGauge } from './metrics.service';

/**
 * Owner decision 2026-11-09 (refund policy): the refund policy is shown BEFORE payment and the patient ticks "I agree" (KSA e-commerce law: the terms are stated before the
 * contract). Every booking or order a patient creates carries `refund_policy_accepted: true`; the server stores the acceptance (the fact, the time and the policy version) on the
 * booking so a dispute can show what the patient agreed to.
 *
 * ROLLOUT (owner/reviewer 2026-11-09): the default is `optional`. A create WITHOUT the field is let through (nothing stored) because the current website and every installed app
 * version cannot send it yet (old apps never will); an explicit `false` is always refused. `required` (a missing field is 400 `refund_policy_acceptance_required`) is turned on
 * later by config only (env REFUND_POLICY_ACCEPTANCE=required), after (a) the website's tick is live and (b) the app release with the tick is the minimum supported version.
 * Every create without the field is counted (`nabd_refund_policy_missing_total`) so it is visible when flipping is safe.
 *
 * Admin and system creates (back office, seeding) are exempt: nobody is agreeing there.
 */
export const REFUND_POLICY_VERSION = '2026-11-09';
export const REFUND_POLICY_REQUIRED_CODE = 'refund_policy_acceptance_required';

export interface RefundPolicyAcceptance { accepted: true; at: Date; version: string }

const EXEMPT_ROLES = ['admin', 'super_admin', 'system'];

/** The acceptance to store on the new booking / order; undefined for an exempt actor. Throws 400 `refund_policy_acceptance_required` when a patient did not tick it. */
let missingCount = 0;
registerGauge('nabd_refund_policy_missing_total', 'Patient bookings/orders created without the refund-policy tick (field missing) while REFUND_POLICY_ACCEPTANCE is optional', () => missingCount, 'counter');
/** How many patient creates came without the field in this process (the metric above; exported for tests). */
export function refundPolicyMissingCount(): number { return missingCount; }

/** `required` only when the env says exactly so; anything else (unset, `optional`, a typo) is the safe default `optional`. */
export function refundPolicyMode(): 'required' | 'optional' { return process.env.REFUND_POLICY_ACCEPTANCE === 'required' ? 'required' : 'optional'; }

/** The acceptance to store on the new booking / order; undefined for an exempt actor or a missing field while optional. Throws 400 `refund_policy_acceptance_required` for an explicit `false` / a wrong type, and for a missing field once `required` is on. */
export function refundPolicyAcceptance(user: { role?: string } | undefined, accepted: unknown, now: Date = new Date()): RefundPolicyAcceptance | undefined {
  if (EXEMPT_ROLES.includes(String(user?.role || '').toLowerCase())) return undefined;
  if (accepted === true) return { accepted: true, at: now, version: REFUND_POLICY_VERSION };
  if (refundPolicyMode() === 'optional' && (accepted === undefined || accepted === null)) { missingCount += 1; return undefined; }
  throw new BadRequestException(REFUND_POLICY_REQUIRED_CODE);
}

/** The field every create DTO carries (optional at validation; the helper above decides). */
export const REFUND_POLICY_ACCEPTED_DOC = 'The patient ticked "I agree" to the refund policy shown before payment (missing is allowed while the rollout is optional; an explicit false is refused, and so is a missing field once REFUND_POLICY_ACCEPTANCE=required).';
