# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/prescriptions-design.test.ts`
- **Member SHA-256:** `67fc0680752ed11a4fe5febe04ef72e262fea284ed8ab1cdd2d35d8c3d738609`
- **Line count:** 19
- **Read range:** `1-19`
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
- `8: it("provides responsive prescription cards and explicit states", () => {`
- `11: expect(css).toContain(".state");`
### payment_insurance_relevance
- `8: it("provides responsive prescription cards and explicit states", () => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
