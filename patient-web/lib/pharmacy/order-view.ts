// No zod: the reorder screen is a client component. These read what GET /patient/pharmacy/orders (the list) and
// GET /patient/pharmacy/orders/:id (the detail) send, and nothing else: an order's status, its lines, the price the
// server stored for the selected offer, the courier the pharmacy named and the events the server logged. Nothing is
// computed, guessed or filled in; a field the API did not send is left out and the screens do not draw it.
import { governedStep } from "./governed-step";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

/** What an order of the patient's own looks like in the list. */
export type OrderRow = {
  id: string;
  status?: string;
  createdAt?: string;
  itemCount?: number;
  /** The server's total of the offer the patient selected; absent while no offer has been selected (the order's own total is then 0). */
  total?: number;
  currency?: string;
};

/** The server's price of an order: the selected offer's snapshot, else the order's own totals once they are above zero. */
function priceOf(source: Record<string, unknown>): { total?: number; currency?: string } {
  const totals = record(record(source.pricing_snapshot)?.totals) ?? record(source.totals);
  const total = num(totals?.total);
  if (total === undefined || total <= 0) return {};
  return { total, currency: text(totals?.currency) };
}

/** The list answers a bare array (some proxies wrap it as `data`). A row without an id is not an order. */
export function parseOrderRows(payload: unknown): OrderRow[] {
  const root = record(payload);
  const list = Array.isArray(payload) ? payload : [root?.data, root?.orders, root?.items].find(Array.isArray);
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry): OrderRow[] => {
    const row = record(entry);
    const id = text(row?.id);
    if (!row || !id) return [];
    return [{
      id,
      status: text(row.effective_status) ?? text(row.status),
      createdAt: text(row.createdAt) ?? text(row.created_at),
      itemCount: Array.isArray(row.items) && row.items.length > 0 ? row.items.length : undefined,
      ...priceOf(row),
    }];
  });
}

/** The short number an order is known by on screen and in a conversation: the end of its id. */
export function orderNumber(id: string): string {
  return id.replace(/[^0-9a-z]/gi, "").slice(-6).toUpperCase();
}

const PREVIOUS = new Set(["delivered", "completed", "cancelled"]);

/** The board's two tabs: an order that is still moving, or one that is finished (delivered, completed or cancelled). */
export function isPrevious(status: string | undefined): boolean {
  return PREVIOUS.has((status ?? "").toLowerCase());
}

export type OrderAction = "reorder" | "track" | "continue" | "details";

const TRACKED = new Set(["confirmed", "in_fulfillment", "out_for_delivery"]);

/**
 * The one action a row offers (the board's "track" / "details" / "reorder"). A finished order can be ordered again, an
 * order that is being fulfilled is tracked, a cancelled one only has its details, and every other order is continued
 * where it stands (the order router reads the server's state and opens that step).
 */
export function orderAction(status: string | undefined): OrderAction {
  const key = (status ?? "").toLowerCase();
  if (key === "delivered" || key === "completed") return "reorder";
  if (key === "cancelled") return "details";
  if (TRACKED.has(key)) return "track";
  return "continue";
}

export type OrderLine = { id: string; name: string; qty: number; sku?: string };

export type OrderDetail = {
  id: string;
  status?: string;
  governedState?: string;
  paymentStatus?: string;
  coverageMode?: "cash" | "insurance";
  createdAt?: string;
  fulfillment?: "delivery" | "pickup";
  prescriptionId?: string;
  lines: OrderLine[];
  /** Totals exactly as the server stored them for the selected offer. */
  totals?: { subtotal?: number; deliveryFee?: number; total: number; currency?: string };
  address?: { label?: string; street?: string; district?: string; city?: string };
  courier?: { name?: string; phone?: string; eta?: string };
  /** What the server logged, in the order it logged it (`order.timeline`). */
  events: Array<{ event: string; at?: string }>;
  dispatchedAt?: string;
  deliveredAt?: string;
};

function lineName(locale: string, item: Record<string, unknown>): string | undefined {
  const pick = locale === "ar" ? [item.name_ar, item.name_en, item.raw_name] : [item.name_en, item.name_ar, item.raw_name];
  return pick.map(text).find(Boolean);
}

/** The detail of one order (`GET /patient/pharmacy/orders/:id`), with the names in the reader's language first. */
export function parseOrderDetail(payload: unknown, locale: string): OrderDetail | null {
  const root = record(payload);
  const source = record(root?.data) ?? root;
  const id = text(source?.id);
  if (!source || !id) return null;
  const coverage = text(source.coverage_mode);
  const price = priceOf(source);
  const snapshotTotals = record(record(source.pricing_snapshot)?.totals) ?? record(source.totals);
  const address = record(source.delivery_address);
  const delivery = record(source.delivery);
  const fulfillment = text(source.fulfillment) ?? text(delivery?.method);
  const items = Array.isArray(source.items) ? source.items : [];
  const timeline = Array.isArray(source.timeline) ? source.timeline : [];
  const courier = delivery ? { name: text(delivery.courier_name), phone: text(delivery.courier_phone), eta: text(delivery.courier_eta) ?? text(delivery.eta) } : undefined;
  return {
    id,
    status: text(source.effective_status) ?? text(source.status),
    governedState: governedStep(source.governed_state),
    paymentStatus: text(source.payment_status),
    coverageMode: coverage === "cash" || coverage === "insurance" ? coverage : undefined,
    createdAt: text(source.createdAt) ?? text(source.created_at),
    fulfillment: fulfillment === "pickup" ? "pickup" : fulfillment === "delivery" || fulfillment === "pharmacy_delivery" ? "delivery" : undefined,
    prescriptionId: text(source.prescription_id),
    lines: items.flatMap((entry): OrderLine[] => {
      const item = record(entry);
      const itemId = text(item?.id);
      const name = item ? lineName(locale, item) : undefined;
      if (!item || !itemId || !name) return [];
      const qty = num(item.qty);
      return [{ id: itemId, name, qty: qty !== undefined && qty >= 1 ? Math.min(99, Math.trunc(qty)) : 1, sku: text(item.matched_sku) ?? text(item.sku) }];
    }),
    totals: price.total === undefined ? undefined : { subtotal: num(snapshotTotals?.subtotal), deliveryFee: num(snapshotTotals?.delivery_fee), total: price.total, currency: price.currency },
    address: address ? { label: text(address.label), street: text(address.street) ?? text(address.line1), district: text(address.district), city: text(address.city) } : undefined,
    courier: courier && (courier.name || courier.phone || courier.eta) ? courier : undefined,
    events: timeline.flatMap((entry) => {
      const row = record(entry);
      const event = text(row?.event);
      return event ? [{ event, at: text(row?.ts) }] : [];
    }),
    dispatchedAt: text(delivery?.dispatched_at),
    deliveredAt: text(delivery?.delivered_at),
  };
}

export type TrackingStepId = "accepted" | "preparing" | "onTheWay" | "delivered" | "pickedUp";
export type TrackingStep = { id: TrackingStepId; state: "done" | "current" | "upcoming"; at?: string };

/** The order's status ranked along the fulfilment path the server walks it through (CONFIRMED -> IN_FULFILLMENT -> OUT_FOR_DELIVERY -> DELIVERED). */
const RANK: Record<string, number> = { confirmed: 1, in_fulfillment: 2, out_for_delivery: 3, delivered: 4, completed: 4 };

/** The server's own words for the moment each step was reached (`order.timeline`). */
const EVENTS: Record<TrackingStepId, string[]> = {
  accepted: ["all_allocations_confirmed"],
  preparing: ["fulfillment_started"],
  onTheWay: ["first_out_for_delivery", "out_for_delivery"],
  delivered: ["all_allocations_delivered", "order_completed"],
  pickedUp: ["all_allocations_delivered", "order_completed"],
};

/**
 * The steps of canvas/OrderTracking, for an order the server has confirmed: accepted, preparing, on the way, delivered
 * (a pickup has no "on the way"; its last step is "picked up"). A step is done once the order's status is past it,
 * current while the order is in it, upcoming before. The time of a step is the server's logged event, and absent when
 * the server logged none. An order that was cancelled has no steps.
 */
export function trackingSteps(detail: Pick<OrderDetail, "status" | "fulfillment" | "events">): TrackingStep[] {
  const status = (detail.status ?? "").toLowerCase();
  if (status === "cancelled") return [];
  const rank = RANK[status] ?? 0;
  const ids: TrackingStepId[] = detail.fulfillment === "pickup" ? ["accepted", "preparing", "pickedUp"] : ["accepted", "preparing", "onTheWay", "delivered"];
  return ids.map((id, index) => {
    const own = index + 1;
    const last = index === ids.length - 1;
    const reached = last ? rank >= 4 : rank > own;
    const state: TrackingStep["state"] = reached ? "done" : rank === own ? "current" : "upcoming";
    const at = [...detail.events].reverse().find((entry) => EVENTS[id].includes(entry.event))?.at;
    return { id, state, at: state === "upcoming" ? undefined : at };
  });
}

/** Whether the order can still change on its own (so the tracking page keeps asking the server). */
export function isMoving(status: string | undefined): boolean {
  const key = (status ?? "").toLowerCase();
  return key !== "" && key !== "delivered" && key !== "completed" && key !== "cancelled";
}

/** A phone number the courier's call link may carry: digits and a leading +, nothing a link could smuggle in. */
export function dialable(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return /^\+?\d{6,15}$/.test(cleaned) ? cleaned : undefined;
}

/** One line of the order as the browser cart takes it, or why it cannot be: a line the catalogue does not know has no id to put in the cart. */
export type CatalogueLine = OrderLine & { sku: string };
export type ReorderLines = { addable: CatalogueLine[]; skipped: number };

export function reorderLines(detail: Pick<OrderDetail, "lines">): ReorderLines {
  const addable = detail.lines.filter((line): line is CatalogueLine => Boolean(line.sku));
  return { addable, skipped: detail.lines.length - addable.length };
}

/**
 * The lines to put in the browser cart for what the patient ticked. The cart's id is the catalogue product (the order
 * line's `matched_sku`), the quantity is the patient's (1 to 99), and there is no price: the cart holds none,
 * the pharmacies send theirs again. When the earlier order used a prescription
 * the lines are marked as needing one, so checkout asks for it again.
 */
export function cartItemsFor(lines: CatalogueLine[], picks: Record<string, { on: boolean; qty: number }>, needsPrescription: boolean) {
  return lines.flatMap((line) => {
    const pick = picks[line.id];
    if (!pick?.on) return [];
    return [{ id: line.sku, name: line.name, rx: needsPrescription, qty: Math.min(99, Math.max(1, Math.trunc(pick.qty) || 1)) }];
  });
}
