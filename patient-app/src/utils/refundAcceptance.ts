/**
 * The refund policy is shown before payment and the patient ticks "I agree" (owner decision 2026-11-09, KSA e-commerce law). The backend
 * requires `refund_policy_accepted: true` in the body of every patient booking or order create and answers 400
 * `refund_policy_acceptance_required` without it; an explicit false is always refused. Every create that sends a body goes through
 * `withRefundPolicy`, so the field is never forgotten or sent as false. Same helper as the web (patient-web/lib/refund-policy.ts).
 */
export const REFUND_POLICY_FIELD = 'refund_policy_accepted' as const;

/** The body with the acceptance added. Only called after the patient ticked: it never produces `false`. */
export function withRefundPolicy<T extends Record<string, unknown>>(body: T): T & { refund_policy_accepted: true } {
  return { ...body, [REFUND_POLICY_FIELD]: true } as T & { refund_policy_accepted: true };
}
