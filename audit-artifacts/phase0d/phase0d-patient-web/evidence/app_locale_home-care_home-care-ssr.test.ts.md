# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/home-care/home-care-ssr.test.ts`
- **Member SHA-256:** `69a807921c1f955f0fc6c20d5a4b0216eef9aa57518d679b8b82ac950a9f053f`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: const state = vi.hoisted(() => ({ getPatientHomeCareBookings: vi.fn(), requirePatientAccess: vi.fn() }));`
- `10: vi.mock("@/lib/api/home-care-server", () => ({ getPatientHomeCareBookings: state.getPatientHomeCareBookings }));`
- `12: import HomeCarePage from "./page";`
- `14: const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";`
- `19: state.getPatientHomeCareBookings.mockReset();`
- `24: state.getPatientHomeCareBookings.mockResolvedValue(new Response(JSON.stringify([{ id: bookingId, service_name_en: "Verified service", state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", sessions_count: 2, patient_name: "private", `
- `26: const html = renderToStaticMarkup(await HomeCarePage({ params: Promise.resolve({ locale: "en" }) }));`
- `28: expect(state.getPatientHomeCareBookings).toHaveBeenCalledWith(serverToken);`
### backend_consumers_or_contracts
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/home-care-server", () => ({ getPatientHomeCareBookings: state.getPatientHomeCareBookings }));`
### auth_ownership
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `15: const serverToken = "server-only-home-care-token-never-in-html";`
- `20: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `23: it("renders approved list fields only without token, location, clinical notes, or pricing", async () => {`
- `24: state.getPatientHomeCareBookings.mockResolvedValue(new Response(JSON.stringify([{ id: bookingId, service_name_en: "Verified service", state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", sessions_count: 2, patient_name: "private", `
- `28: expect(state.getPatientHomeCareBookings).toHaveBeenCalledWith(serverToken);`
- `30: expect(html).not.toContain(serverToken);`
### state_transitions
- `4: const state = vi.hoisted(() => ({ getPatientHomeCareBookings: vi.fn(), requirePatientAccess: vi.fn() }));`
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/home-care-server", () => ({ getPatientHomeCareBookings: state.getPatientHomeCareBookings }));`
- `19: state.getPatientHomeCareBookings.mockReset();`
- `20: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `23: it("renders approved list fields only without token, location, clinical notes, or pricing", async () => {`
- `24: state.getPatientHomeCareBookings.mockResolvedValue(new Response(JSON.stringify([{ id: bookingId, service_name_en: "Verified service", state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", sessions_count: 2, patient_name: "private", `
- `28: expect(state.getPatientHomeCareBookings).toHaveBeenCalledWith(serverToken);`
### payment_insurance_relevance
- `24: state.getPatientHomeCareBookings.mockResolvedValue(new Response(JSON.stringify([{ id: bookingId, service_name_en: "Verified service", state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", sessions_count: 2, patient_name: "private", `
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
