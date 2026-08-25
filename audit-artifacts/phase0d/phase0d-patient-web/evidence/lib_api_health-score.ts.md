# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/health-score.ts`
- **Member SHA-256:** `a2fded619d5ca6d0ec62b853bfb17ebcb7bd6ec897c5b52c44581dc407f7e1e2`
- **Line count:** 11
- **Read range:** `1-11`
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
- `4: const scoreSchema = z.object({ score: z.number().finite().min(0).max(100).nullable(), status: z.string().min(1).max(64), components: z.array(componentSchema).max(32).optional() }).passthrough();`
- `5: export type HealthScore = { score: number | null; status: string; components: Array<{ key: string; score: number }> };`
- `9: if (!parsed.success) return null;`
- `10: return { score: parsed.data.score, status: parsed.data.status, components: (parsed.data.components ?? []).map(({ key, score }) => ({ key, score })) };`
### payment_insurance_relevance
- `6: export function parseHealthScore(payload: unknown): HealthScore | null {`
- `7: const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
