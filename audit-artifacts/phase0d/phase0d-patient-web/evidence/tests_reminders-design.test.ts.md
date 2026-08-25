# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/reminders-design.test.ts`
- **Member SHA-256:** `3ac17862accd6040ee9f37f8c50e08e207c5bcb4eb5e4ce89a44bb5b6ba0a5d0`
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
- `8: it("provides an explicit dose summary, responsive cards, and honest states", () => {`
- `11: expect(css).toContain(".state");`
### payment_insurance_relevance
- `8: it("provides an explicit dose summary, responsive cards, and honest states", () => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
