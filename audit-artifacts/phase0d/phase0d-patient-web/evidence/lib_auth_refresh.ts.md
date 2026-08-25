# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/auth/refresh.ts`
- **Member SHA-256:** `5b78d1fbab647fd5c0f4f891935e6c898591420df35e9c1774983a75791b326a`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: const tokenPairSchema = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) });`
- `5: export function refreshRequestBody(refreshToken: string) {`
- `6: return JSON.stringify({ refresh_token: refreshToken });`
- `9: export function parseRefreshedTokens(payload: unknown) {`
- `10: const parsed = tokenPairSchema.safeParse(payload);`
### state_transitions
- `11: return parsed.success ? parsed.data : null;`
### payment_insurance_relevance
- `9: export function parseRefreshedTokens(payload: unknown) {`
- `10: const parsed = tokenPairSchema.safeParse(payload);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
