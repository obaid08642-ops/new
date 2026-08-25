# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/route-state-ssr.test.tsx`
- **Member SHA-256:** `611d51d00d29f9f92f45099a63da81cff0f9f45cdc069f5ebe0869128dfb9f75`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: describe("locale route states", () => {`
- `15: expect(html).toContain('href="/ar"');`
- `18: it("exposes a polite loading state without route data", () => {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: const html = renderToStaticMarkup(<LocaleError error={new Error("upstream-token-and-stack-must-not-render")} reset={vi.fn()} />);`
- `13: expect(html).not.toContain("upstream-token-and-stack-must-not-render");`
- `14: expect(html).toContain('role="alert"');`
- `22: expect(html).toContain('role="status"');`
### state_transitions
- `6: import LocaleError from "./error";`
- `7: import LocaleLoading from "./loading";`
- `9: describe("locale route states", () => {`
- `10: it("does not serialize an upstream error message in the recovery boundary", () => {`
- `11: const html = renderToStaticMarkup(<LocaleError error={new Error("upstream-token-and-stack-must-not-render")} reset={vi.fn()} />);`
- `18: it("exposes a polite loading state without route data", () => {`
- `19: const html = renderToStaticMarkup(<LocaleLoading />);`
- `22: expect(html).toContain('role="status"');`
- `23: expect(html).toContain("loadingTitle");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `6: import LocaleError from "./error";`
- `7: import LocaleLoading from "./loading";`
- `10: it("does not serialize an upstream error message in the recovery boundary", () => {`
- `11: const html = renderToStaticMarkup(<LocaleError error={new Error("upstream-token-and-stack-must-not-render")} reset={vi.fn()} />);`
- `18: it("exposes a polite loading state without route data", () => {`
- `19: const html = renderToStaticMarkup(<LocaleLoading />);`
- `23: expect(html).toContain("loadingTitle");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
