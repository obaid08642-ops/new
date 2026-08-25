# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/doctors-detail-server.test.ts`
- **Member SHA-256:** `9c7c9086f223e5f3729abcb6e2bc49f7102eb0bde2fa3226721a310526036ca7`
- **Line count:** 3
- **Read range:** `1-3`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: describe("doctor detail wrapper",()=>{const old=globalThis.fetch;beforeEach(()=>{globalThis.fetch=vi.fn().mockResolvedValue(new Response("{}",{status:200}))});afterEach(()=>{globalThis.fetch=old;vi.restoreAllMocks()});it("uses public GET wi`
### state_transitions
- `3: describe("doctor detail wrapper",()=>{const old=globalThis.fetch;beforeEach(()=>{globalThis.fetch=vi.fn().mockResolvedValue(new Response("{}",{status:200}))});afterEach(()=>{globalThis.fetch=old;vi.restoreAllMocks()});it("uses public GET wi`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
