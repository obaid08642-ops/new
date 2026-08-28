import { z } from "zod";

const requestIdSchema = z.string().uuid();
const stateSchema = z.enum(["PENDING_PROVIDER_REVIEW", "APPROVED_FULL", "COPAY_PENDING", "COPAY_PAID", "REJECTED", "SELF_PAY_PENDING", "SELF_PAY_PAID", "CANCELLED"]);
const responseSchema = z.object({
  id: requestIdSchema, state: stateSchema, copay_amount: z.number().finite().nonnegative().optional(), self_pay_amount: z.number().finite().positive().optional(), rejection_reason: z.string().trim().min(1).max(2000).optional(),
});
export type InsuranceRequest = { id: string; state: z.infer<typeof stateSchema>; copayAmount?: number; selfPayAmount?: number; rejectionReason?: string };
function record(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
export function parseInsuranceRequest(value: unknown): InsuranceRequest | null {
  const root = record(value); const parsed = responseSchema.safeParse(record(root?.data) ?? root);
  return parsed.success ? { id: parsed.data.id, state: parsed.data.state, copayAmount: parsed.data.copay_amount, selfPayAmount: parsed.data.self_pay_amount, rejectionReason: parsed.data.rejection_reason } : null;
}
