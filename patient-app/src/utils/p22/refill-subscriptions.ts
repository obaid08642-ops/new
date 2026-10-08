/**
 * P22.1 — auto-refill subscriptions (patient surfaces).
 *
 * Backend contract (sibling branch p22-a, verified by reading):
 *   POST pharmacy/refills/subscriptions  { items:[{medicine_id,qty}], cadence_days,
 *     prescription_id?, prescription_valid_until?, reminder_days_before?,
 *     first_refill_at?, delivery_address? }
 *   GET  pharmacy/refills/subscriptions
 *   POST pharmacy/refills/subscriptions/:id/cancel
 *
 * This module holds the pure rules + a thin injectable client. Screens stay
 * thin and never fabricate subscription state.
 */

export interface RefillItemInput {
  medicine_id: string;
  qty: number;
}

export interface SubscribeRefillInput {
  items: RefillItemInput[];
  cadence_days: number;
  prescription_id?: string;
  prescription_valid_until?: string;
  reminder_days_before?: number;
  first_refill_at?: string;
  delivery_address?: Record<string, unknown>;
}

export type RefillSubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired_rx';

export interface RefillSubscription {
  id: string;
  items: RefillItemInput[];
  cadence_days: number;
  prescription_valid_until?: string | null;
  next_refill_at?: string | null;
  reminder_at?: string | null;
  status: RefillSubscriptionStatus | string;
}

export type ApiFetch = (path: string, init?: Record<string, unknown>) => Promise<unknown>;

export const REFILL_ENDPOINTS = {
  subscribe: 'pharmacy/refills/subscriptions',
  mine: 'pharmacy/refills/subscriptions',
  cancel: (id: string) => `pharmacy/refills/subscriptions/${id}/cancel`,
} as const;

/** Guard the subscribe body before it ever leaves the device. Throws on invalid input. */
export function buildSubscribeBody(input: SubscribeRefillInput): Record<string, unknown> {
  const items = (input.items || [])
    .map((it) => ({ medicine_id: String(it.medicine_id || '').trim(), qty: Number(it.qty) }))
    .filter((it) => it.medicine_id.length > 0);
  if (items.length === 0) throw new Error('refill_items_required');
  for (const it of items) {
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 99) throw new Error('refill_qty_invalid');
  }
  const cadence = Number(input.cadence_days);
  if (!Number.isInteger(cadence) || cadence < 7 || cadence > 120) throw new Error('refill_cadence_invalid');
  const body: Record<string, unknown> = { items, cadence_days: cadence };
  if (input.prescription_id) body.prescription_id = input.prescription_id;
  if (input.prescription_valid_until) body.prescription_valid_until = input.prescription_valid_until;
  if (input.reminder_days_before !== undefined) {
    const r = Number(input.reminder_days_before);
    if (!Number.isInteger(r) || r < 0 || r > 14) throw new Error('refill_reminder_invalid');
    body.reminder_days_before = r;
  }
  if (input.first_refill_at) body.first_refill_at = input.first_refill_at;
  if (input.delivery_address) body.delivery_address = input.delivery_address;
  return body;
}

/** A subscription whose prescription has lapsed must never auto-order. */
export function isRxValid(sub: Pick<RefillSubscription, 'prescription_valid_until'>, now: Date = new Date()): boolean {
  if (!sub.prescription_valid_until) return true;
  const until = new Date(sub.prescription_valid_until).getTime();
  if (!Number.isFinite(until)) return false;
  return until >= now.getTime();
}

/** Whole days until the next refill; null when the backend gave no date. */
export function daysUntilRefill(sub: Pick<RefillSubscription, 'next_refill_at'>, now: Date = new Date()): number | null {
  if (!sub.next_refill_at) return null;
  const at = new Date(sub.next_refill_at).getTime();
  if (!Number.isFinite(at)) return null;
  return Math.max(0, Math.ceil((at - now.getTime()) / 86400000));
}

/** Only active subscriptions with a valid Rx can still produce refill orders. */
export function canProduceRefill(sub: RefillSubscription, now: Date = new Date()): boolean {
  return sub.status === 'active' && isRxValid(sub, now);
}

function unwrapList(res: unknown): RefillSubscription[] {
  if (Array.isArray(res)) return res as RefillSubscription[];
  const obj = (res || {}) as { data?: unknown; subscriptions?: unknown };
  if (Array.isArray(obj.data)) return obj.data as RefillSubscription[];
  if (Array.isArray(obj.subscriptions)) return obj.subscriptions as RefillSubscription[];
  return [];
}

export async function listRefillSubscriptions(fetch: ApiFetch): Promise<RefillSubscription[]> {
  const res = await fetch(`/${REFILL_ENDPOINTS.mine}`);
  return unwrapList(res);
}

export async function subscribeRefill(fetch: ApiFetch, input: SubscribeRefillInput): Promise<unknown> {
  const body = buildSubscribeBody(input);
  return fetch(`/${REFILL_ENDPOINTS.subscribe}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': `refill-sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` },
    body: JSON.stringify(body),
  });
}

export async function cancelRefillSubscription(fetch: ApiFetch, id: string): Promise<unknown> {
  if (!id) throw new Error('refill_id_required');
  return fetch(`/${REFILL_ENDPOINTS.cancel(id)}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': `refill-cancel-${id}-${Date.now().toString(36)}` },
    body: JSON.stringify({}),
  });
}
