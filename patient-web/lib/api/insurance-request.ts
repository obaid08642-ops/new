import { z } from "zod";

const requestIdSchema = z.string().uuid();
const stateSchema = z.enum(["PENDING_PROVIDER_REVIEW", "APPROVED_FULL", "COPAY_PENDING", "COPAY_PAID", "REJECTED", "SELF_PAY_PENDING", "SELF_PAY_PAID", "CANCELLED"]);
const responseSchema = z.object({
  id: requestIdSchema, state: stateSchema, copay_amount: z.number().finite().nonnegative().optional(), self_pay_amount: z.number().finite().positive().optional(), rejection_reason: z.string().trim().min(1).max(2000).optional(),
  // The provider's record (the approval number is `approval_code` when the provider app wrote it, `insurer_approval_code` when the insurance engine did): a null or odd value means "not sent" and must not make the page unreadable.
  approval_code: z.string().trim().min(1).max(200).nullish().catch(undefined), insurer_approval_code: z.string().trim().min(1).max(200).nullish().catch(undefined), copay_percent: z.number().finite().min(0).max(100).nullish().catch(undefined),
});
export type InsuranceRequest = { id: string; state: z.infer<typeof stateSchema>; copayAmount?: number; selfPayAmount?: number; rejectionReason?: string; approvalCode?: string; copayPercent?: number };
function record(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
export function parseInsuranceRequest(value: unknown): InsuranceRequest | null {
  const root = record(value); const parsed = responseSchema.safeParse(record(root?.data) ?? root);
  return parsed.success ? { id: parsed.data.id, state: parsed.data.state, copayAmount: parsed.data.copay_amount, selfPayAmount: parsed.data.self_pay_amount, rejectionReason: parsed.data.rejection_reason, approvalCode: parsed.data.approval_code ?? parsed.data.insurer_approval_code ?? undefined, copayPercent: parsed.data.copay_percent ?? undefined } : null;
}
