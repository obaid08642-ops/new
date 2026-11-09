import { BadRequestException } from '@nestjs/common';

/**
 * Owner decision 2026-11-09 (refund policy): the refund policy is shown BEFORE payment and the patient ticks "I agree" (KSA e-commerce law: the terms are stated before the
 * contract). Every booking or order a patient creates carries `refund_policy_accepted: true`; the server stores the acceptance (the fact, the time and the policy version) on the
 * booking so a dispute can show what the patient agreed to. A create without it is a 400 with a clear code (clients send the field in the same release).
 *
 * Admin and system creates (back office, seeding) are exempt: nobody is agreeing there.
 */
export const REFUND_POLICY_VERSION = '2026-11-09';
export const REFUND_POLICY_REQUIRED_CODE = 'refund_policy_acceptance_required';

export interface RefundPolicyAcceptance { accepted: true; at: Date; version: string }

const EXEMPT_ROLES = ['admin', 'super_admin', 'system'];

/** The acceptance to store on the new booking / order; undefined for an exempt actor. Throws 400 `refund_policy_acceptance_required` when a patient did not tick it. */
export function refundPolicyAcceptance(user: { role?: string } | undefined, accepted: unknown, now: Date = new Date()): RefundPolicyAcceptance | undefined {
  if (EXEMPT_ROLES.includes(String(user?.role || '').toLowerCase())) return undefined;
  if (accepted === true) return { accepted: true, at: now, version: REFUND_POLICY_VERSION };
  // ROLLOUT SWITCH (env REFUND_POLICY_ACCEPTANCE=optional): while a client that cannot send the tick yet is still deployed, a MISSING field is let through (nothing is stored). An explicit
  // `false` is always refused. The default is "required": production and every test refuse a patient create without the tick.
  if (process.env.REFUND_POLICY_ACCEPTANCE === 'optional' && (accepted === undefined || accepted === null)) return undefined;
  throw new BadRequestException(REFUND_POLICY_REQUIRED_CODE);
}

/** The field every create DTO carries (optional at validation, so the clear 400 above is what an old client gets). */
export const REFUND_POLICY_ACCEPTED_DOC = 'The patient ticked "I agree" to the refund policy shown before payment (required for a patient: 400 refund_policy_acceptance_required without it).';
