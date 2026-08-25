# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/orders/orders-ssr.test.ts`
- **Member SHA-256:** `86254d2f00f79c73517f63d7ddf72b66e1dcf0d54aab2cedae9a68cc5f912a9e`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import OrdersPage from "./page";`
- `10: import OrderDetailPage from "./[orderId]/page";`
- `11: import OrderTrackingPage from "./[orderId]/tracking/page";`
- `14: describe("orders SSR boundary and visual card", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders the order card through BFF without embedding`
- `16: describe("order detail SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders only the allowlisted order summary without customer, a`
- `18: describe("order tracking SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders tracking status only from the authorized backend and`
### backend_consumers_or_contracts
- `7: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `8: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `14: describe("orders SSR boundary and visual card", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders the order card through BFF without embedding`
- `16: describe("order detail SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders only the allowlisted order summary without customer, a`
- `18: describe("order tracking SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders tracking status only from the authorized backend and`
### auth_ownership
- `7: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `12: const serverToken = "server-only-order-token";`
- `14: describe("orders SSR boundary and visual card", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders the order card through BFF without embedding`
- `16: describe("order detail SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders only the allowlisted order summary without customer, a`
- `18: describe("order tracking SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders tracking status only from the authorized backend and`
- `20: for (const secret of [serverToken, "private-address", "private-notes", "private-file"]) expect(html).not.toContain(secret); }); });`
### state_transitions
- `3: const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), requirePatientAccess: vi.fn() }));`
- `7: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `8: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `14: describe("orders SSR boundary and visual card", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders the order card through BFF without embedding`
- `16: describe("order detail SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders only the allowlisted order summary without customer, a`
- `18: describe("order tracking SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders tracking status only from the authorized backend and`
### payment_insurance_relevance
- `14: describe("orders SSR boundary and visual card", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders the order card through BFF without embedding`
- `16: describe("order detail SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders only the allowlisted order summary without customer, a`
- `18: describe("order tracking SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders tracking status only from the authorized backend and`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
