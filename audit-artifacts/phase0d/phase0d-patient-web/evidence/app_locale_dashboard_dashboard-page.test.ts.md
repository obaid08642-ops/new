# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/dashboard/dashboard-page.test.ts`
- **Member SHA-256:** `932f07c6fc824edb3a0a822ae63a49d639223daaf51d43d04bea2dd8215e01fc`
- **Line count:** 9
- **Read range:** `1-9`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import DashboardPage from "./page";`
- `9: describe("patient dashboard visual shell", () => { beforeEach(() => { state.access = true; state.redirect.mockReset(); }); it("renders the reference-inspired private dashboard without embedding the session token", async () => { const html =`
### backend_consumers_or_contracts
- `9: describe("patient dashboard visual shell", () => { beforeEach(() => { state.access = true; state.redirect.mockReset(); }); it("renders the reference-inspired private dashboard without embedding the session token", async () => { const html =`
### auth_ownership
- `4: vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => state.access ? { value: "test-access-token" } : undefined }) }));`
- `9: describe("patient dashboard visual shell", () => { beforeEach(() => { state.access = true; state.redirect.mockReset(); }); it("renders the reference-inspired private dashboard without embedding the session token", async () => { const html =`
### state_transitions
- `3: const state = vi.hoisted(() => ({ access: true, redirect: vi.fn() }));`
- `4: vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => state.access ? { value: "test-access-token" } : undefined }) }));`
- `5: vi.mock("next/navigation", () => ({ redirect: state.redirect }));`
- `9: describe("patient dashboard visual shell", () => { beforeEach(() => { state.access = true; state.redirect.mockReset(); }); it("renders the reference-inspired private dashboard without embedding the session token", async () => { const html =`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
