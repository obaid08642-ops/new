# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/profile/profile-page-ssr.test.ts`
- **Member SHA-256:** `52fabe86443fd2279ab426d6e51fe85d98245e828f9fbc894902ea75ae190da9`
- **Line count:** 44
- **Read range:** `1-44`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: state.redirect, useRouter: () => ({ refresh: vi.fn() }) }));`
- `13: import ProfilePage from "./page";`
- `27: const html = renderToStaticMarkup(await ProfilePage({ params: Promise.resolve({ locale: "en" }) }));`
- `40: await ProfilePage({ params: Promise.resolve({ locale: "ar" }) });`
- `42: expect(state.redirect).toHaveBeenCalledWith("/ar/login");`
### backend_consumers_or_contracts
- `10: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => state.token }));`
- `11: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: async () => state.responses.shift()! }));`
### auth_ownership
- `4: const state = vi.hoisted(() => ({ token: "profile-server-token-never-in-html", redirect: vi.fn(), responses: [] as Response[] }));`
- `6: vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: state.redirect, useRouter: () => ({ refresh: vi.fn() }) }));`
- `10: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => state.token }));`
- `17: state.token = "profile-server-token-never-in-html";`
- `26: it("renders allowed fields and an error state without serializing sensitive keys or the session token", async () => {`
- `32: expect(html).not.toContain(state.token);`
- `37: it("redirects to sign-in when any profile domain reports an expired session", async () => {`
- `42: expect(state.redirect).toHaveBeenCalledWith("/ar/login");`
### state_transitions
- `4: const state = vi.hoisted(() => ({ token: "profile-server-token-never-in-html", redirect: vi.fn(), responses: [] as Response[] }));`
- `6: vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: state.redirect, useRouter: () => ({ refresh: vi.fn() }) }));`
- `10: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => state.token }));`
- `11: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: async () => state.responses.shift()! }));`
- `17: state.token = "profile-server-token-never-in-html";`
- `18: state.redirect.mockReset();`
- `19: state.responses = [`
- `20: new Response(JSON.stringify({ fullName: "Visible patient", storage_key: "private-storage-key" }), { status: 200 }),`
- `21: new Response(JSON.stringify({ bloodType: "O+", internal_note: "clinical-private-note" }), { status: 200 }),`
- `22: new Response(null, { status: 503 }),`
- `26: it("renders allowed fields and an error state without serializing sensitive keys or the session token", async () => {`
- `32: expect(html).not.toContain(state.token);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `26: it("renders allowed fields and an error state without serializing sensitive keys or the session token", async () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
