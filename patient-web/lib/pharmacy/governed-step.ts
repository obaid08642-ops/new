/**
 * The server's governed step, as the web routes it. Two newer server states keep the screen they had before:
 * PAYMENT_PENDING (Q-21: an accepted quote with a payment under way) is still the pay step, and the payment page resumes
 * the same transaction; CO_PAY_PENDING (Q-3: the co-pay accepted, not yet paid) is still the insurance decision step,
 * where the co-pay is paid.
 */
export function governedStep(value: unknown): string | undefined {
  const state = typeof value === "string" && value.trim() ? value.trim() : undefined;
  if (state === "PAYMENT_PENDING") return "FINAL_QUOTE_ACCEPTED";
  if (state === "CO_PAY_PENDING") return "INSURANCE_DECISION_READY";
  return state;
}
