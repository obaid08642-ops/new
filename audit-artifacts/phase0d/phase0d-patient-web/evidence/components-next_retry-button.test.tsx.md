# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/retry-button.test.tsx`
- **Member SHA-256:** `53377a14a07f01c7a3c222897eb6ded615af39454a070537bd9e94c43564f926`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));`
- `7: vi.mock("next-intl", () => ({ useTranslations: () => () => "retry" }));`
- `9: import { RetryButton } from "./retry-button";`
- `11: describe("RetryButton", () => {`
- `12: it("renders a localized, non-submit recovery control", () => {`
- `13: const html = renderToStaticMarkup(<RetryButton />);`
- `16: expect(html).toContain(">retry<");`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `4: const state = vi.hoisted(() => ({ refresh: vi.fn() }));`
- `6: vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));`
- `17: expect(html).not.toContain("token");`
### state_transitions
- `4: const state = vi.hoisted(() => ({ refresh: vi.fn() }));`
- `6: vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));`
- `7: vi.mock("next-intl", () => ({ useTranslations: () => () => "retry" }));`
- `9: import { RetryButton } from "./retry-button";`
- `11: describe("RetryButton", () => {`
- `13: const html = renderToStaticMarkup(<RetryButton />);`
- `16: expect(html).toContain(">retry<");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: vi.mock("next-intl", () => ({ useTranslations: () => () => "retry" }));`
- `9: import { RetryButton } from "./retry-button";`
- `11: describe("RetryButton", () => {`
- `13: const html = renderToStaticMarkup(<RetryButton />);`
- `16: expect(html).toContain(">retry<");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
