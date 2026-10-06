/**
 * The cancellation policy of GET /system-config/public (`cancellation_policy`), the same one the doctor page's FAQ reads:
 * the full amount back from `full_hours` before the visit, `half_refund_percent` from `half_hours`, nothing after.
 */
export interface CancellationPolicy {
  full_hours: number;
  half_hours: number;
  half_refund_percent: number;
}

/** The policy when the server states all three numbers, otherwise null (nothing is assumed). */
export function readCancellationPolicy(config: unknown): CancellationPolicy | null {
  const raw = (config as { cancellation_policy?: Record<string, unknown> } | null | undefined)?.cancellation_policy;
  if (!raw || typeof raw !== 'object') return null;
  const { full_hours, half_hours, half_refund_percent } = raw;
  if (typeof full_hours !== 'number' || typeof half_hours !== 'number' || typeof half_refund_percent !== 'number') return null;
  return { full_hours, half_hours, half_refund_percent };
}

/** The share of the booking that comes back when cancelling `hoursUntil` hours ahead; null while either is unknown. */
export function refundPercent(hoursUntil: number | null, policy: CancellationPolicy | null): number | null {
  if (hoursUntil == null || !policy) return null;
  if (hoursUntil >= policy.full_hours) return 100;
  if (hoursUntil >= policy.half_hours) return policy.half_refund_percent;
  return 0;
}
