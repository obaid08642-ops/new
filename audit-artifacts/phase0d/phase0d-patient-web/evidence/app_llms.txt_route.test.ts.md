# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/llms.txt/route.test.ts`
- **Member SHA-256:** `6c2d14b404140143eb968c3a4cde68b635cf2296d6434124d5d813fde4875b80`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import { GET } from "./route";`
- `4: describe("llms.txt route", () => {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `15: expect(body).not.toContain("accessToken");`
### state_transitions
- `9: expect(response.status).toBe(200);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
