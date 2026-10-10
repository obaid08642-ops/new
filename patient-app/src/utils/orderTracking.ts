/**
 * Order tracking (Batch 1e): what the patient is told about where a pharmacy order is, read from
 * GET /patient/pharmacy/orders/:id (pharmacy-order.service.ts `detail`) and nothing else:
 *
 *   status / effective_status   the order's own state (`effective_status` folds in the allocations' progress)
 *   timeline[]                  {ts, event}: `all_allocations_confirmed`, `fulfillment_started`, `first_out_for_delivery`,
 *                               `all_allocations_delivered` are written when the order moves; they time the steps
 *   allocations_detail[]        the pharmacies' parts: a `ready_for_pickup` status or event tells a pickup is ready
 *   delivery                    {courier_name, courier_phone, courier_eta, dispatched_at}, set when a pharmacy dispatches
 *   fulfillment                 `delivery` | `pickup`
 *
 * No step, time, courier, arrival time or map point is made up: a step has a time only when the server recorded the event,
 * the arrival time is the courier's own `courier_eta`, and a courier is shown only when the pharmacy named one.
 */
import { orderRoute, readPayOrder, type OrderRoute, type PayOrder } from './pharmacyCheckout';
import { orderPharmacyNames, type OfferTotals } from './pharmacyOffers';

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);
const record = (value: unknown): Record<string, unknown> | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const time = (value: unknown): number | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const at = new Date(value).getTime();
  return Number.isFinite(at) ? at : null;
};

export type StepId = 'accepted' | 'preparing' | 'onTheWay' | 'ready' | 'delivered' | 'collected';
export type StepState = 'done' | 'current' | 'upcoming';

export interface TrackStep {
  id: StepId;
  state: StepState;
  /** Epoch ms of the event the server recorded for this step; null when it recorded none. */
  at: number | null;
}

export interface Courier {
  name: string;
  /** Digits and `+` only, safe for a `tel:` link; null when the pharmacy gave none. */
  phone: string | null;
}

export interface TrackingView {
  order: PayOrder;
  /** `effective_status` (or `status`), lower-case. */
  status: string;
  cancelled: boolean;
  done: boolean;
  fulfillment: 'delivery' | 'pickup';
  steps: TrackStep[];
  /** True until the pharmacy has accepted the order: the timeline has not started. */
  notStarted: boolean;
  /** Epoch ms of the courier's own estimate; null when none was given or the order is not on its way. */
  eta: number | null;
  courier: Courier | null;
  itemCount: number;
  totals: OfferTotals;
  /** The filling pharmacy's names as the server sent them (#366/#514); null when it sent none. */
  pharmacy: { ar: string | null; en: string | null } | null;
  /** The screen that continues the order when it still needs the patient (offers, final price, insurance); null when this screen is it. */
  next: OrderRoute | null;
}

/** The first recorded time of any of the events in a `timeline` array. */
function eventAt(timeline: unknown, names: string[]): number | null {
  if (!Array.isArray(timeline)) return null;
  let best: number | null = null;
  for (const entry of timeline) {
    const e = record(entry);
    if (!e || !names.includes(String(e.event))) continue;
    const at = time(e.ts);
    if (at !== null && (best === null || at < best)) best = at;
  }
  return best;
}

function phone(raw: unknown): string | null {
  const value = text(raw);
  const cleaned = value ? value.replace(/[^\d+]/g, '') : '';
  return cleaned.replace(/\D/g, '').length >= 5 ? cleaned : null;
}

export function readTracking(response: unknown): TrackingView | null {
  const order = readPayOrder(response);
  if (!order) return null;
  const root = record(response);
  const o = record(root?.data) ?? root ?? {};
  const status = (text(o.effective_status) ?? order.status).toLowerCase();
  const fulfillment: 'delivery' | 'pickup' = order.fulfillment === 'pickup' ? 'pickup' : 'delivery';
  const allocations = Array.isArray(o.allocations_detail) ? o.allocations_detail.map(record).filter((a): a is Record<string, unknown> => a !== null) : [];
  const ready = allocations.some((a) => a.status === 'ready_for_pickup');
  const cancelled = status === 'cancelled';
  const done = status === 'delivered' || status === 'completed';

  const ids: StepId[] = fulfillment === 'pickup' ? ['accepted', 'preparing', 'ready', 'collected'] : ['accepted', 'preparing', 'onTheWay', 'delivered'];
  // the index of the step the order has reached; -1 before the pharmacy accepted it, ids.length once everything is done
  let reached = -1;
  if (done) reached = ids.length;
  else if (!cancelled) {
    if (status === 'out_for_delivery') reached = 2;
    else if (status === 'in_fulfillment') reached = fulfillment === 'pickup' && ready ? 2 : 1;
    else if (status === 'confirmed') reached = 0;
  }

  const timeline = o.timeline;
  const times: Record<StepId, number | null> = {
    accepted: eventAt(timeline, ['all_allocations_confirmed']),
    preparing: eventAt(timeline, ['fulfillment_started']),
    onTheWay: eventAt(timeline, ['first_out_for_delivery', 'out_for_delivery']),
    ready: allocations.map((a) => eventAt(a.timeline, ['ready_for_pickup'])).filter((t): t is number => t !== null).sort((a, b) => a - b)[0] ?? null,
    delivered: eventAt(timeline, ['all_allocations_delivered']),
    collected: eventAt(timeline, ['all_allocations_delivered']),
  };
  const steps: TrackStep[] = ids.map((id, i) => ({
    id,
    at: i <= reached || done ? times[id] : null,
    state: done ? 'done' : i < reached ? 'done' : i === reached ? 'current' : 'upcoming',
  }));

  const delivery = record(o.delivery);
  const name = text(delivery?.courier_name);
  const eta = reached === 2 && fulfillment === 'delivery' ? time(delivery?.courier_eta) : null;

  const route = orderRoute({ id: order.id, status: order.status, governed_state: order.governedState, payment_status: order.paymentStatus, selected_offer_id: order.selectedOfferId, payment_method: order.paymentMethod });
  const next = route.pathname === '/pharmacy/order-tracking' || order.governedState === 'COD_REGISTERED' || cancelled ? null : route;

  return {
    order,
    status,
    cancelled,
    done,
    fulfillment,
    steps,
    notStarted: reached < 0 && !cancelled,
    eta,
    courier: name ? { name, phone: phone(delivery?.courier_phone) } : null,
    itemCount: Array.isArray(o.items) ? o.items.length : 0,
    totals: order.totals,
    pharmacy: orderPharmacyNames(response),
    next,
  };
}

/** A legacy order's tracking (`GET /orders/:id/tracking`: `state`, `pharmacy_name`, `total`, `delivery`), #368. */
export interface LegacyTrackingView {
  id: string;
  /** The order's own `state` as sent (an OrderState such as `OUT_FOR_DELIVERY`); the screen words it through `statusLook`. */
  state: string;
  pharmacyName: string | null;
  total: number | null;
  courier: Courier | null;
  /** The delivery's own estimate in minutes; null when the server sent none. */
  etaMinutes: number | null;
}

export function readLegacyTracking(response: unknown): LegacyTrackingView | null {
  const root = record(response);
  const o = record(root?.data) ?? root;
  const id = text(o?.order_id);
  const state = text(o?.state);
  if (!o || !id || !state) return null;
  const delivery = record(o.delivery);
  const name = text(delivery?.courier_name);
  const rawEta = delivery?.eta_minutes;
  const eta = typeof rawEta === 'number' && Number.isFinite(rawEta) && rawEta > 0 ? Math.round(rawEta) : null;
  return {
    id,
    state,
    pharmacyName: text(o.pharmacy_name),
    total: typeof o.total === 'number' && Number.isFinite(o.total) ? o.total : null,
    courier: name ? { name, phone: phone(delivery?.courier_phone) } : null,
    etaMinutes: eta,
  };
}

/** The translation key of the button that continues an order which still needs the patient. */
export function nextKey(next: OrderRoute): string {
  if (next.pathname === '/pharmacy/final-quote') return 'orders.track.continueQuote';
  if (next.pathname === '/pharmacy/insurance-decision') return 'orders.track.continueInsurance';
  return 'orders.track.continueOffers';
}
