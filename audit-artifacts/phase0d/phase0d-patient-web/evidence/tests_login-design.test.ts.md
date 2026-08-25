# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/login-design.test.ts`
- **Member SHA-256:** `aaf9250d172c8afdad43f8b1f8e687c0c6d79213a869042a59e0dcc7d6fd4265`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: const formCss = readFileSync(resolve(process.cwd(), "components-next/login-form.module.css"), "utf8");`
- `6: const pageCss = readFileSync(resolve(process.cwd(), "app/[locale]/login/login.module.css"), "utf8");`
- `8: describe("patient login design", () => {`
- `9: it("keeps an accessible, high-clarity input and submit treatment", () => {`
- `12: expect(formCss).toContain(".submit:focus-visible");`
- `17: expect(pageCss).toContain("var(--radius-2xl)");`
- `18: expect(pageCss).toContain("var(--shadow-lg)");`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: const formCss = readFileSync(resolve(process.cwd(), "components-next/login-form.module.css"), "utf8");`
- `6: const pageCss = readFileSync(resolve(process.cwd(), "app/[locale]/login/login.module.css"), "utf8");`
- `8: describe("patient login design", () => {`
- `16: it("uses the shared visual tokens and reduced-motion treatment", () => {`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
