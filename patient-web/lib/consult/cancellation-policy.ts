import { callPatientApi } from "@/lib/api/upstream";

/**
 * The cancellation policy of GET /system-config/public (`cancellation_policy`): the full amount back from `full_hours`
 * before the visit, `half_refund_percent` from `half_hours`, nothing after. The screens build their sentences from these
 * numbers (decision 26); none of them is written in a message or a screen.
 */
export type CancellationPolicy = { fullHours: number; halfHours: number; halfPercent: number };

/** The policy when the server states all three numbers, otherwise null (nothing is assumed). */
export function readCancellationPolicy(config: unknown): CancellationPolicy | null {
  const root = config && typeof config === "object" ? (config as Record<string, unknown>) : null;
  const raw = root?.cancellation_policy;
  if (!raw || typeof raw !== "object") return null;
  const { full_hours, half_hours, half_refund_percent } = raw as Record<string, unknown>;
  if (typeof full_hours !== "number" || typeof half_hours !== "number" || typeof half_refund_percent !== "number") return null;
  return { fullHours: full_hours, halfHours: half_hours, halfPercent: half_refund_percent };
}

/** The share that comes back when cancelling `hoursUntil` hours ahead, by the server's numbers; null while either is unknown. */
export function refundPercent(hoursUntil: number | null, policy: CancellationPolicy | null): number | null {
  if (hoursUntil === null || !policy) return null;
  if (hoursUntil >= policy.fullHours) return 100;
  if (hoursUntil >= policy.halfHours) return policy.halfPercent;
  return 0;
}

/** Server-side read of the public configuration; null when the server does not answer or does not state the policy. */
export async function getCancellationPolicy(accessToken?: string | null): Promise<CancellationPolicy | null> {
  const response = await callPatientApi("/system-config/public", {}, accessToken);
  if (!response.ok) return null;
  return readCancellationPolicy(await response.json().catch(() => null));
}
