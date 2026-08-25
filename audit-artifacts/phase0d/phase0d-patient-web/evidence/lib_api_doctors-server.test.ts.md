# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/doctors-server.test.ts`
- **Member SHA-256:** `d1030b26c9160c535e7064e83c500c104b513c3bcb7bf1084e15789f7e6d96c4`
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
- No matching static signal found in this member.
### state_transitions
- `3: describe("public doctors wrapper", () => { const original=globalThis.fetch; beforeEach(()=>{globalThis.fetch=vi.fn().mockResolvedValue(new Response("[]",{status:200}));}); afterEach(()=>{globalThis.fetch=original;vi.restoreAllMocks();}); it`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
