# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/login-form.test.tsx`
- **Member SHA-256:** `3882bb79f2bfb6bd513a344792e0fd00fbb2d61d0c86adc1d335bbbd516ed7aa`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));`
- `9: import { LoginForm } from "../components-next/login-form";`
- `11: describe("LoginForm", () => {`
- `13: const html = renderToStaticMarkup(<LoginForm locale="en" />);`
- `17: expect(html).toContain("submit</button>");`
- `22: it("does not expose internal Sandbox guidance on the production sign-in page", () => {`
- `23: const page = readFileSync(resolve(process.cwd(), "app/[locale]/login/page.tsx"), "utf8");`
- `25: expect(page).not.toContain('t("sandboxNote")');`
- `26: expect(page).not.toContain("Sandbox@");`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `6: vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));`
- `9: import { LoginForm } from "../components-next/login-form";`
- `11: describe("LoginForm", () => {`
- `13: const html = renderToStaticMarkup(<LoginForm locale="en" />);`
- `23: const page = readFileSync(resolve(process.cwd(), "app/[locale]/login/page.tsx"), "utf8");`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
