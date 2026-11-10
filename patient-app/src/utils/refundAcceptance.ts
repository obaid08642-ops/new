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

/**
 * The text of the policy at the tick, per service (lane Z: `GET /refund-policy/summary?service=...` answers
 * `{ service, version, hash, lines: [{ key, params }] }`). The server sends keys and the numbers it applies; the wording is ours, in the six
 * languages (`refund.policy.*`). An unknown key is dropped, never shown raw. Same reader as the web (patient-web/lib/refund-policy.ts).
 */
export type RefundService = 'consultation' | 'lab' | 'radiology' | 'nursing' | 'pharmacy';
export type RefundLine = { key: string; params: Record<string, string | number> };

export const refundSummaryPath = (service: RefundService): string => `/refund-policy/summary?service=${service}`;

/** Every line key the server may send; each has a message in all six languages (tested). */
export const KNOWN_LINES = new Set([
  'consultation.full', 'consultation.late', 'consultation.patient_no_show', 'consultation.free_reschedule', 'consultation.provider_no_show',
  'lab.after_transit', 'nursing.after_transit', 'nursing.patient_absent',
  'lab.full', 'lab.late', 'nursing.full', 'nursing.late', 'radiology.full', 'radiology.late', 'pharmacy.before_preparation', 'pharmacy.before_preparation_fee', 'pharmacy.after_preparation', 'consultation.late_rescheduled', 
  'provider_cancel', 'card_destination',
]);

/** The lines of the summary answer as locale keys (`refund.policy.<key>`) with their numbers. */
export function readRefundSummary(payload: unknown): RefundLine[] {
  const list = payload && typeof payload === 'object' ? (payload as { lines?: unknown }).lines : null;
  if (!Array.isArray(list)) return [];
  const out: RefundLine[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = (entry as { key?: unknown }).key;
    if (typeof raw !== 'string' || !raw.startsWith('refund.policy.')) continue;
    const rawParams = (entry as { params?: unknown }).params;
    const params: Record<string, string | number> = {};
    if (rawParams && typeof rawParams === 'object') {
      for (const [name, value] of Object.entries(rawParams as Record<string, unknown>)) {
        if (typeof value === 'string' || typeof value === 'number') params[name] = value;
        else if (typeof value === 'boolean') params[name] = value ? '1' : '0';
      }
    }
    let key = raw.slice('refund.policy.'.length);
    if (key === 'pharmacy.before_preparation' && params.delivery_fee_refunded === '1') key = 'pharmacy.before_preparation_fee';
    if (KNOWN_LINES.has(key)) out.push({ key: `refund.policy.${key}`, params });
  }
  return out;
}
