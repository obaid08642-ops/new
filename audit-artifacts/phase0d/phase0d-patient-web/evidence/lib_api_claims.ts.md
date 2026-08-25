# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/claims.ts`
- **Member SHA-256:** `ce36de5b245e85152af32e2c2a59e1c9cddb00fb594ed7117a45011a55e14b04`
- **Line count:** 38
- **Read range:** `1-38`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `6: status: z.enum(["approved", "reimbursed", "pending", "rejected"]).optional(),`
- `13: status?: "approved" | "reimbursed" | "pending" | "rejected";`
- `30: if (!parsed.success) return [];`
- `34: status: parsed.data.status,`
### payment_insurance_relevance
- `17: export function parseClaims(payload: unknown): ClaimSummary[] {`
- `18: const root = payload && typeof payload === "object" && !Array.isArray(payload)`
- `19: ? payload as Record<string, unknown>`
- `21: const list = Array.isArray(payload)`
- `22: ? payload`
### error_empty_loading_retry_cancel
- `6: status: z.enum(["approved", "reimbursed", "pending", "rejected"]).optional(),`
- `13: status?: "approved" | "reimbursed" | "pending" | "rejected";`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
