import type { OrderPaymentView } from "./payment-state";

/** Statuses an order has before any offer is selected, while the pharmacies are being asked (the server sends no governed state for them). */
const BROADCAST = new Set([
  "intake_processing", "ready_for_split", "broadcasting", "awaiting_full_acceptance", "negotiating_substitutes",
  "allocating", "partially_allocated", "fully_allocated", "offer_selection_pending",
]);

/**
 * The page an order belongs on, from the states the backend really produces (`governedView` in
 * pharmacy-order.service.ts): no governed state until an offer is selected, then OFFER_SELECTED, FINAL_QUOTE_READY,
 * FINAL_QUOTE_ACCEPTED, COD_REGISTERED, INSURANCE_PROCESSING, INSURANCE_DECISION_READY, and the order's own status
 * once fulfilment starts. (OFFERS_READY and ORDER_BROADCASTING are not states the server sends: the phase before a
 * selection is read from the order's status.)
 */
export function routeForOrder(view: OrderPaymentView, orderId: string, locale: string): string {
  const id = encodeURIComponent(orderId);
  const tracking = `/${locale}/orders/${id}/tracking`;
  if (view.paymentStatus === "paid") return tracking;
  switch (view.governedState) {
    case "OFFER_SELECTED":
    case "FINAL_QUOTE_READY":
      return `/${locale}/pharmacy/final-quote?orderId=${id}`;
    case "FINAL_QUOTE_ACCEPTED":
      return `/${locale}/pharmacy/payment?orderId=${id}`;
    case "INSURANCE_PROCESSING":
    case "INSURANCE_DECISION_READY":
      return `/${locale}/pharmacy/insurance-decision?orderId=${id}`;
    case undefined:
    case "":
      break;
    default:
      return tracking;
  }
  const status = (view.status ?? "").toLowerCase();
  if (status === "draft") return `/${locale}/pharmacy/waiting-for-pharmacy?orderId=${id}`;
  if (BROADCAST.has(status)) return `/${locale}/pharmacy/broadcast-status?orderId=${id}`;
  return tracking;
}
