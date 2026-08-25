# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/i18n/messages.test.ts`
- **Member SHA-256:** `e31936d2394acb1410209eabc1026b9633ce819653a946b1989d0bb06f6a7051`
- **Line count:** 71
- **Read range:** `1-71`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: for (const namespace of ["Shared", "Home", "Login", "Dashboard", "Metadata", "NotFound"] as const) {`
- `21: for (const namespace of ["Shared", "Home", "Login", "Dashboard", "Metadata", "NotFound", "RouteState"] as const) {`
- `27: it("keeps every private patient-page namespace structurally translated in the four additional locales", () => {`
- `57: const [loading, loginForm] = await Promise.all([`
- `59: readFile(new URL("../../components-next/login-form.tsx", import.meta.url), "utf8")`
- `62: expect(loginForm).not.toContain("setMessage(payload.message");`
- `63: expect(loginForm).toContain("onChange={(event) => setPassword(event.target.value)}");`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `14: for (const namespace of ["Shared", "Home", "Login", "Dashboard", "Metadata", "NotFound"] as const) {`
- `21: for (const namespace of ["Shared", "Home", "Login", "Dashboard", "Metadata", "NotFound", "RouteState"] as const) {`
- `57: const [loading, loginForm] = await Promise.all([`
- `59: readFile(new URL("../../components-next/login-form.tsx", import.meta.url), "utf8")`
- `62: expect(loginForm).not.toContain("setMessage(payload.message");`
- `63: expect(loginForm).toContain("onChange={(event) => setPassword(event.target.value)}");`
### state_transitions
- `21: for (const namespace of ["Shared", "Home", "Login", "Dashboard", "Metadata", "NotFound", "RouteState"] as const) {`
- `56: it("does not leave raw loading labels or backend messages in the visible core", async () => {`
- `57: const [loading, loginForm] = await Promise.all([`
- `58: readFile(new URL("../../app/[locale]/dashboard/loading.tsx", import.meta.url), "utf8"),`
- `61: expect(loading).not.toContain('aria-label="Loading"');`
### payment_insurance_relevance
- `62: expect(loginForm).not.toContain("setMessage(payload.message");`
### error_empty_loading_retry_cancel
- `56: it("does not leave raw loading labels or backend messages in the visible core", async () => {`
- `57: const [loading, loginForm] = await Promise.all([`
- `58: readFile(new URL("../../app/[locale]/dashboard/loading.tsx", import.meta.url), "utf8"),`
- `61: expect(loading).not.toContain('aria-label="Loading"');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
