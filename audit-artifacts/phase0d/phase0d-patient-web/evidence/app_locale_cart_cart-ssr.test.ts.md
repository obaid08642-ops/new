# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/cart/cart-ssr.test.ts`
- **Member SHA-256:** `afbaf747d83841fbbd13d9ece3c1053704490241e702ae93175ec5f5654845b9`
- **Line count:** 45
- **Read range:** `1-45`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import CartPage from "./page";`
- `10: import CartCheckoutPreviewPage from "./checkout/page";`
- `16: const html = renderToStaticMarkup(await CartPage({ params: Promise.resolve({ locale: "en" }) }));`
- `24: const html = renderToStaticMarkup(await CartPage({ params: Promise.resolve({ locale: "en" }) }));`
- `29: it("renders unavailable checkout totals without inventing a zero amount", async () => {`
- `31: const html = renderToStaticMarkup(await CartCheckoutPreviewPage({ params: Promise.resolve({ locale: "en" }) }));`
- `36: it("renders checkout totals as a read-only preview without payment mutation", async () => {`
- `38: const html = renderToStaticMarkup(await CartCheckoutPreviewPage({ params: Promise.resolve({ locale: "en" }) }));`
- `39: expect(state.callPatientApi).toHaveBeenCalledWith("/cart/checkout", {}, "server-only-cart-token");`
### backend_consumers_or_contracts
- `7: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `8: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
### auth_ownership
- `7: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `13: beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue("server-only-cart-token"); state.callPatientApi.mockReset(); });`
- `14: it("renders only bounded cart fields without token or private metadata", async () => {`
- `17: expect(state.callPatientApi).toHaveBeenCalledWith("/cart", {}, "server-only-cart-token");`
- `19: for (const secret of ["server-only-cart-token", "private-patient", "private-notes", "private"]) expect(html).not.toContain(secret);`
- `39: expect(state.callPatientApi).toHaveBeenCalledWith("/cart/checkout", {}, "server-only-cart-token");`
### state_transitions
- `3: const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), requirePatientAccess: vi.fn() }));`
- `7: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `8: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `13: beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue("server-only-cart-token"); state.callPatientApi.mockReset(); });`
- `15: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ patient_id: "private-patient", groups: [{ kind: "pharmacy", count: 1, subtotal: 12, items: [{ line_id: "line-1", service_id: "med-1", name_ar: "Medicine", qty: 2, price: 6`
- `17: expect(state.callPatientApi).toHaveBeenCalledWith("/cart", {}, "server-only-cart-token");`
- `23: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ groups: [{ kind: "pharmacy", items: [{ line_id: "line-1", service_id: "med-1", name_ar: "Medicine" }] }], currency: "SAR" }), { status: 200 }));`
- `30: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ currency: "SAR" }), { status: 200 }));`
- `37: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ patient_id: "private-patient", subtotal: 12, home_visit_fee: 0, total: 12, currency: "SAR", notes: "private" }), { status: 200 }));`
- `39: expect(state.callPatientApi).toHaveBeenCalledWith("/cart/checkout", {}, "server-only-cart-token");`
### payment_insurance_relevance
- `15: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ patient_id: "private-patient", groups: [{ kind: "pharmacy", count: 1, subtotal: 12, items: [{ line_id: "line-1", service_id: "med-1", name_ar: "Medicine", qty: 2, price: 6`
- `29: it("renders unavailable checkout totals without inventing a zero amount", async () => {`
- `36: it("renders checkout totals as a read-only preview without payment mutation", async () => {`
- `37: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ patient_id: "private-patient", subtotal: 12, home_visit_fee: 0, total: 12, currency: "SAR", notes: "private" }), { status: 200 }));`
- `43: expect(html).not.toContain("payment");`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
