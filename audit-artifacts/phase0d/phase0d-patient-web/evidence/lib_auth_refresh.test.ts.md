# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/auth/refresh.test.ts`
- **Member SHA-256:** `d6957133b2952afb80724357b44aad5a734752a1b24eb420d5e27c19c6f778d1`
- **Line count:** 10
- **Read range:** `1-10`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `2: import { parseRefreshedTokens, refreshRequestBody } from "./refresh";`
- `4: describe("refresh contract", () => {`
- `5: it("uses the backend refresh_token key and accepts only a complete rotated token pair", () => {`
- `6: expect(JSON.parse(refreshRequestBody("refresh-value"))).toEqual({ refresh_token: "refresh-value" });`
- `7: expect(parseRefreshedTokens({ accessToken: "access", refreshToken: "refresh" })).toEqual({ accessToken: "access", refreshToken: "refresh" });`
- `8: expect(parseRefreshedTokens({ accessToken: "access" })).toBeNull();`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
