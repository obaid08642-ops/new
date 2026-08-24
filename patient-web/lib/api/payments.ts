import { z } from "zod";

const paymentId = z.string().uuid();
const resultSchema = z.object({ transactionId: paymentId, status: z.string().min(1).max(40), amount: z.number().finite().nonnegative().optional(), currency: z.string().trim().min(3).max(8).optional(), checkoutUrl: z.string().url().optional() });
export type PaymentIntentResult = z.infer<typeof resultSchema>;
function record(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function text(r: Record<string, unknown>, keys: string[]) { for (const key of keys) if (typeof r[key] === "string" && r[key].trim()) return r[key] as string; return undefined; }
export function parsePaymentIntent(value: unknown): PaymentIntentResult | null {
  const root = record(value); const r = record(root?.data) ?? root; if (!r) return null;
  const id = paymentId.safeParse(text(r, ["transaction_id", "transactionId", "id"])); if (!id.success) return null;
  const rawAmount = r.amount; const amount = typeof rawAmount === "number" && Number.isFinite(rawAmount) && rawAmount >= 0 ? rawAmount : undefined;
  const parsed = resultSchema.safeParse({ transactionId: id.data, status: text(r, ["status"]) ?? "pending", amount, currency: text(r, ["currency"]) ?? "SAR", checkoutUrl: text(r, ["checkout_url", "checkoutUrl", "url"]) });
  return parsed.success ? parsed.data : null;
}
export function parsePaymentType(value: string) { return z.enum(["consultation", "pharmacy", "lab", "radiology", "nursing", "insurance"]).safeParse(value); }
