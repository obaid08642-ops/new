# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/diagnostics-design.test.ts`
- **Member SHA-256:** `a4c6a706459cedb3375c3e4c43ee16b3e04a31ca49d7eb0ee5e01acdad947d10`
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
- `8: it("provides a responsive diagnostic hierarchy with honest alerts and empty states", () => {`
- `10: expect(css).toContain(".alert, .empty");`
### payment_insurance_relevance
- `12: expect(css).toContain(".card:focus-visible");`
### error_empty_loading_retry_cancel
- `8: it("provides a responsive diagnostic hierarchy with honest alerts and empty states", () => {`
- `10: expect(css).toContain(".alert, .empty");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
