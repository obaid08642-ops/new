/** The statuses of a pharmacy order that the offer screens have words for (`PharmacyOffers.status.*`). */
const STATUS_LABELS = new Set([
  "draft", "intake_processing", "ready_for_split", "broadcasting", "awaiting_full_acceptance", "negotiating_substitutes", "allocating",
  "partially_allocated", "fully_allocated", "offer_selection_pending", "cash_card_payment_pending", "cod_due_on_delivery",
  "insurance_decision_pending", "waiting_copay", "manual_review", "confirmed", "in_fulfillment", "out_for_delivery", "delivered", "completed", "cancelled",
]);

/** The key of an order status in the translation files; a status the screen has no words for reads "in progress". */
export function statusKey(status: string | undefined): string {
  const key = (status ?? "").toLowerCase();
  return STATUS_LABELS.has(key) ? key : "other";
}
