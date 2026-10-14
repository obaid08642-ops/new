import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import type { ServiceTone } from "@/components-next/ui-generated/icons/fill";

/**
 * The chip tone of an order status, from the board's own pairing (canvas/Orders): on its way is coral, delivered is mint,
 * waiting for something is amber. Tones come from the handoff service map and are never written as colour names.
 */
export function statusTone(status: string | undefined): ServiceTone {
  switch ((status ?? "").toLowerCase()) {
    case "delivered":
    case "completed":
    case "confirmed":
      return OFFER_TONES.good;
    case "in_fulfillment":
    case "out_for_delivery":
      return OFFER_TONES.pharmacy;
    case "insurance_decision_pending":
      return OFFER_TONES.info;
    case "cancelled":
    case "draft":
      return "ink";
    default:
      return OFFER_TONES.warn;
  }
}
