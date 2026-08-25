# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/dashboard/dashboard-ssr.test.ts`
- **Member SHA-256:** `aaabe406218d6c2265a472e273f0124e848ed7bf1395f848226ee866f2d30159`
- **Line count:** 37
- **Read range:** `1-37`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import DashboardPage from "./page";`
- `23: const html = renderToStaticMarkup(await DashboardPage({ params: Promise.resolve({ locale: "en" }) }));`
- `30: it("redirects missing sessions to the locale-specific sign-in route", async () => {`
- `33: await DashboardPage({ params: Promise.resolve({ locale: "ar" }) });`
- `35: expect(state.redirect).toHaveBeenCalledWith("/ar/login");`
### backend_consumers_or_contracts
- `10: vi.mock("@/lib/api/dashboard-server", () => ({ getPatientDashboardProfile: state.profile, getPatientDashboardUpcomingAppointment: state.appointment }));`
- `26: for (const href of ["/en/orders", "/en/appointments", "/en/health", "/en/reminders", "/en/diagnostics", "/en/home-care", "/en/family", "/en/chat", "/en/notifications", "/en/prescriptions", "/en/medicines", "/en/profile"]) expect(html).toCon`
### auth_ownership
- `4: const state = vi.hoisted(() => ({ accessToken: "dashboard-server-token-never-in-html", redirect: vi.fn(), profile: vi.fn(), appointment: vi.fn() }));`
- `6: vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "nabd_access" ? { value: state.accessToken } : undefined) }) }));`
- `16: state.accessToken = "dashboard-server-token-never-in-html";`
- `22: it("renders the protected feature links without serializing the session token", async () => {`
- `25: expect(html).not.toContain(state.accessToken);`
- `30: it("redirects missing sessions to the locale-specific sign-in route", async () => {`
- `31: state.accessToken = "";`
- `35: expect(state.redirect).toHaveBeenCalledWith("/ar/login");`
### state_transitions
- `4: const state = vi.hoisted(() => ({ accessToken: "dashboard-server-token-never-in-html", redirect: vi.fn(), profile: vi.fn(), appointment: vi.fn() }));`
- `6: vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "nabd_access" ? { value: state.accessToken } : undefined) }) }));`
- `7: vi.mock("next/navigation", () => ({ redirect: state.redirect }));`
- `10: vi.mock("@/lib/api/dashboard-server", () => ({ getPatientDashboardProfile: state.profile, getPatientDashboardUpcomingAppointment: state.appointment }));`
- `16: state.accessToken = "dashboard-server-token-never-in-html";`
- `17: state.redirect.mockReset();`
- `18: state.profile.mockReset().mockResolvedValue(new Response(JSON.stringify({ name: "Verified patient" }), { status: 200 }));`
- `19: state.appointment.mockReset().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 }));`
- `25: expect(html).not.toContain(state.accessToken);`
- `31: state.accessToken = "";`
- `35: expect(state.redirect).toHaveBeenCalledWith("/ar/login");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
