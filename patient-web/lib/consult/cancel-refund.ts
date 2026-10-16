/**
 * journeys#44: what the cancellation gives back, from the cancelled appointment the server returns (its refund
 * percentage, what was paid and whether it was paid). The money always goes back through the original payment.
 */
export function cancelRefund(payload: unknown): { paid: boolean; percent: number; amount: number } | null {
  const raw = payload && typeof payload === "object" ? ((payload as { data?: unknown }).data ?? payload) : null;
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const percent = Number(row.refund_percentage);
  const total = Number(row.total_price);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  const paid = row.payment_status === "paid" || row.payment_status === "refunded";
  return { paid, percent, amount: paid && Number.isFinite(total) && total > 0 ? Math.round(total * percent) / 100 : 0 };
}
