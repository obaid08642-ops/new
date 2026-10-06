/**
 * P22.2 — back-in-stock / price-drop alert subscriptions (patient surfaces).
 *
 * Backend contract (sibling branch p22-a, verified by reading):
 *   POST   pharmacy/alerts/subscriptions   { medicine_id, kind: 'restock'|'price_drop', price_threshold? }
 *   GET    pharmacy/alerts/subscriptions
 *   DELETE pharmacy/alerts/subscriptions/:id
 */

export type AlertKind = 'restock' | 'price_drop';

export interface AlertSubscription {
  id: string;
  medicine_id: string;
  kind: AlertKind | string;
  price_threshold?: number | null;
}

export type ApiFetch = (path: string, init?: Record<string, unknown>) => Promise<unknown>;

/** Guard the alert body before it leaves the device. Throws on invalid input. */
export function buildAlertBody(input: {
  medicine_id: string;
  kind: AlertKind;
  price_threshold?: number;
}): Record<string, unknown> {
  const medicine_id = String(input.medicine_id || '').trim();
  if (!medicine_id) throw new Error('alert_medicine_required');
  if (input.kind !== 'restock' && input.kind !== 'price_drop') throw new Error('alert_kind_invalid');
  const body: Record<string, unknown> = { medicine_id, kind: input.kind };
  if (input.kind === 'price_drop') {
    const t = Number(input.price_threshold);
    if (!Number.isFinite(t) || t <= 0) throw new Error('alert_threshold_required');
    body.price_threshold = t;
  }
  return body;
}

function unwrapList(res: unknown): AlertSubscription[] {
  if (Array.isArray(res)) return res as AlertSubscription[];
  const obj = (res || {}) as { data?: unknown; subscriptions?: unknown };
  if (Array.isArray(obj.data)) return obj.data as AlertSubscription[];
  if (Array.isArray(obj.subscriptions)) return obj.subscriptions as AlertSubscription[];
  return [];
}

export async function listAlertSubscriptions(fetch: ApiFetch): Promise<AlertSubscription[]> {
  return unwrapList(await fetch('/pharmacy/alerts/subscriptions'));
}

export async function subscribeAlert(
  fetch: ApiFetch,
  input: { medicine_id: string; kind: AlertKind; price_threshold?: number },
): Promise<unknown> {
  return fetch('/pharmacy/alerts/subscriptions', {
    method: 'POST',
    headers: { 'Idempotency-Key': `alert-sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` },
    body: JSON.stringify(buildAlertBody(input)),
  });
}

export async function unsubscribeAlert(fetch: ApiFetch, id: string): Promise<unknown> {
  if (!id) throw new Error('alert_id_required');
  return fetch(`/pharmacy/alerts/subscriptions/${id}`, { method: 'DELETE' });
}
