const count = (record: Record<string, unknown> | null, key: string): number | undefined => {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

/**
 * The rules that apply to a pharmacy order, for its cancel confirmation (decision 26), from GET /system-config/public:
 * whether preparation can still be cancelled, then the return and refund sentences. A number the server did not send is
 * not written, and no hours or days are written in the page.
 */
export function pharmacyCancelRules(
  config: Record<string, unknown> | null,
  text: { prep: string; refundDays: (min: number, max: number) => string; returnDays: (days: number) => string },
): string[] {
  const cancel = asRecord(config?.cancellation_policy);
  const returns = asRecord(config?.returns_policy);
  const rules: string[] = [];
  if (cancel?.pharmacy_prep_cancellable === false) rules.push(text.prep);
  const unused = count(returns, "unused_days");
  if (unused !== undefined) rules.push(text.returnDays(unused));
  const min = count(returns, "wallet_refund_days_min");
  const max = count(returns, "wallet_refund_days_max");
  if (min !== undefined && max !== undefined) rules.push(text.refundDays(min, max));
  return rules;
}
