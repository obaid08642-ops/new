# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/insurance-design.test.ts`
- **Member SHA-256:** `194439ef0ee2084b8081c990d3560b9f5f1842808f0b973e4c33cc6eaa80c8d9`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: it("collapses coverage and claims safely on narrow screens", () => {`
### backend_consumers_or_contracts
- `5: const css = readFileSync(resolve(process.cwd(), "app/[locale]/insurance/insurance.module.css"), "utf8");`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `8: it("provides coverage cards, readable claim statuses, and explicit empty states", () => {`
- `10: expect(css).toContain(".status");`
- `11: expect(css).toContain(".state");`
### payment_insurance_relevance
- `5: const css = readFileSync(resolve(process.cwd(), "app/[locale]/insurance/insurance.module.css"), "utf8");`
- `7: describe("insurance design", () => {`
- `8: it("provides coverage cards, readable claim statuses, and explicit empty states", () => {`
- `15: it("collapses coverage and claims safely on narrow screens", () => {`
### error_empty_loading_retry_cancel
- `8: it("provides coverage cards, readable claim statuses, and explicit empty states", () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
