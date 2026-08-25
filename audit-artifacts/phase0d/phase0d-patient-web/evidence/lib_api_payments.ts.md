# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/payments.ts`
- **Member SHA-256:** `fd07e9ceb3b4355890702d6c03edb43a25e716563d0f83c7e04a2909ec08a783`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: const resultSchema = z.object({ transactionId: paymentId, status: z.string().min(1).max(40), amount: z.number().finite().nonnegative().optional(), currency: z.string().trim().min(3).max(8).optional(), checkoutUrl: z.string().url().optional(`
- `12: const parsed = resultSchema.safeParse({ transactionId: id.data, status: text(r, ["status"]) ?? "pending", amount, currency: text(r, ["currency"]) ?? "SAR", checkoutUrl: text(r, ["checkout_url", "checkoutUrl", "url"]) });`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `4: const resultSchema = z.object({ transactionId: paymentId, status: z.string().min(1).max(40), amount: z.number().finite().nonnegative().optional(), currency: z.string().trim().min(3).max(8).optional(), checkoutUrl: z.string().url().optional(`
- `10: const id = paymentId.safeParse(text(r, ["transaction_id", "transactionId", "id"])); if (!id.success) return null;`
- `12: const parsed = resultSchema.safeParse({ transactionId: id.data, status: text(r, ["status"]) ?? "pending", amount, currency: text(r, ["currency"]) ?? "SAR", checkoutUrl: text(r, ["checkout_url", "checkoutUrl", "url"]) });`
- `13: return parsed.success ? parsed.data : null;`
### payment_insurance_relevance
- `3: const paymentId = z.string().uuid();`
- `4: const resultSchema = z.object({ transactionId: paymentId, status: z.string().min(1).max(40), amount: z.number().finite().nonnegative().optional(), currency: z.string().trim().min(3).max(8).optional(), checkoutUrl: z.string().url().optional(`
- `5: export type PaymentIntentResult = z.infer<typeof resultSchema>;`
- `8: export function parsePaymentIntent(value: unknown): PaymentIntentResult | null {`
- `10: const id = paymentId.safeParse(text(r, ["transaction_id", "transactionId", "id"])); if (!id.success) return null;`
- `15: export function parsePaymentType(value: string) { return z.enum(["consultation", "pharmacy", "lab", "radiology", "nursing", "insurance"]).safeParse(value); }`
### error_empty_loading_retry_cancel
- `12: const parsed = resultSchema.safeParse({ transactionId: id.data, status: text(r, ["status"]) ?? "pending", amount, currency: text(r, ["currency"]) ?? "SAR", checkoutUrl: text(r, ["checkout_url", "checkoutUrl", "url"]) });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
