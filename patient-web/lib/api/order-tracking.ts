/**
 * Q30: order tracking helpers.
 *
 * The tracking endpoint (`GET /orders/:id/tracking`, backend orders.service.ts
 * getTracking) returns `timeline: [{ state, at }]` built from the order's real
 * history (governed `pharmacy_orders.timeline` or legacy `orders.state_history`).
 */
export type TrackingTimelineEvent = { state: string; at?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function extractTrackingTimeline(payload: unknown): TrackingTimelineEvent[] {
  const root = asRecord(payload);
  const source = asRecord(root?.data) ?? root;
  const list = source?.timeline;
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry): TrackingTimelineEvent[] => {
    const record = asRecord(entry);
    const state = record?.state;
    if (typeof state !== "string" || !state.trim()) return [];
    const at = typeof record?.at === "string" && record.at.trim() ? record.at : undefined;
    return [{ state, at }];
  });
}

/**
 * History keys with a translated label in the `OrderTracking.states` messages.
 * Governed events come from the pharmacy services' `timeline` pushes; legacy
 * ones are OrderState values. Anything else is shown readably, never dropped.
 */
export const KNOWN_TIMELINE_STATES = [
  "created", "submitted_by_patient", "edited", "broadcast_started", "split_started", "split_completed",
  "final_quote_accepted", "cod_registered", "pharmacy_insurance_decision_recorded",
  "insurance_co_pay_accepted", "insurance_self_pay_accepted", "all_allocations_confirmed",
  "fulfillment_started", "first_out_for_delivery", "out_for_delivery", "all_allocations_delivered",
  "order_completed", "patient_cancelled_after_rejected_insurance", "cancelled_by_patient",
  "accepted", "preparing", "ready", "payment_completed", "delivered", "completed", "cancelled", "rejected",
] as const;
export type KnownTimelineState = (typeof KNOWN_TIMELINE_STATES)[number];

export function timelineStateKey(state: string): KnownTimelineState | null {
  const key = state.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return (KNOWN_TIMELINE_STATES as readonly string[]).includes(key) ? (key as KnownTimelineState) : null;
}

export function humanizeTimelineState(state: string): string {
  return state.replace(/[_-]+/g, " ").trim();
}

/**
 * `?pay=1` is the payment hand-off (post insurance decision, and the
 * final-quote "Review payment" link). It goes to the existing governed
 * pharmacy payment page, which checks capabilities and starts the intent.
 */
export function trackingPaymentHandoff(locale: string, orderId: string, pay: string | string[] | undefined): string | null {
  const requested = Array.isArray(pay) ? pay.includes("1") : pay === "1";
  return requested ? `/${locale}/pharmacy/payment?orderId=${encodeURIComponent(orderId)}` : null;
}
