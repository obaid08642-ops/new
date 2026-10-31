/**
 * The cancellation policy of GET /system-config/public (`cancellation_policy`), the same one the doctor page's FAQ reads:
 * the full amount back from `full_hours` before the visit and `half_refund_percent` after it. What cancelling now refunds is the
 * server's own figure on the appointment (`cancellation.refund_now`), never computed from these numbers on the device.
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
