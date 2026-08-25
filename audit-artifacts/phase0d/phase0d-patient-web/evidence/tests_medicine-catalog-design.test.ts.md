# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/medicine-catalog-design.test.ts`
- **Member SHA-256:** `4484abfff06adb18ccfa4968cf1bdb42b5f3649bd5a3b8f87903ed8b363158d9`
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
- `8: it("provides a clear search surface, accessible cards, and an honest empty state", () => {`
- `11: expect(css).toContain(".state");`
### payment_insurance_relevance
- `8: it("provides a clear search surface, accessible cards, and an honest empty state", () => {`
- `10: expect(css).toContain(".card:focus-visible");`
### error_empty_loading_retry_cancel
- `8: it("provides a clear search surface, accessible cards, and an honest empty state", () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
