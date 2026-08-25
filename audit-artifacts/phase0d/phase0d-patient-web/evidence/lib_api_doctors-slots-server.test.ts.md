# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/doctors-slots-server.test.ts`
- **Member SHA-256:** `17b774263ff2d647e2416eb82fd23a293689e11622efd35b1bf4311830323496`
- **Line count:** 2
- **Read range:** `1-2`
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
- `2: describe("doctor slots wrapper",()=>{const old=globalThis.fetch;beforeEach(()=>{globalThis.fetch=vi.fn().mockResolvedValue(new Response("{}",{status:200}))});afterEach(()=>{globalThis.fetch=old;vi.restoreAllMocks()});it("uses GET with no au`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
