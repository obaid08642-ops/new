# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/orders-design.test.ts`
- **Member SHA-256:** `fb298bdeee581cb6ebe61b7d45ecb8ade29e0efd353cd2d0a0194013a40b53cd`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `5: const css = readFileSync(resolve(process.cwd(), "app/[locale]/orders/orders.module.css"), "utf8");`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `8: it("provides accessible tabs, cards, and an honest empty state", () => {`
- `11: expect(css).toContain(".state");`
### payment_insurance_relevance
- `8: it("provides accessible tabs, cards, and an honest empty state", () => {`
- `10: expect(css).toContain(".card:focus-visible");`
### error_empty_loading_retry_cancel
- `8: it("provides accessible tabs, cards, and an honest empty state", () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
