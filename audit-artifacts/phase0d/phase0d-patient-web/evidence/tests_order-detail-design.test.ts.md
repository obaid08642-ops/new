# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/order-detail-design.test.ts`
- **Member SHA-256:** `262a99be5352b4ece2db38785e26885572e0bc4c6372099429e4eb0985d16838`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `5: const css = readFileSync(resolve(process.cwd(), "app/[locale]/orders/[orderId]/order-detail.module.css"), "utf8");`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `8: it("provides accessible details, explicit states, and responsive information cards", () => {`
- `11: expect(css).toContain(".state");`
### payment_insurance_relevance
- `8: it("provides accessible details, explicit states, and responsive information cards", () => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
