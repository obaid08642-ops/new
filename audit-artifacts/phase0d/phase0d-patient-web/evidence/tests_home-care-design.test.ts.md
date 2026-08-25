# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/home-care-design.test.ts`
- **Member SHA-256:** `599f148589a01cd616412f19656e18cd685f0241161d7cfc0f02722830c31593`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `5: const css = readFileSync(resolve(process.cwd(), "app/[locale]/home-care/home-care.module.css"), "utf8");`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `8: it("keeps the care cards and states responsive and visually distinct", () => {`
- `11: expect(css).toContain(".state");`
### payment_insurance_relevance
- `8: it("keeps the care cards and states responsive and visually distinct", () => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
