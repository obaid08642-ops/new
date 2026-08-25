# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/reminders/reminders-ssr.test.ts`
- **Member SHA-256:** `3381130ec513a8e0564a5276882d9a71e6472e4cd3a487fe67c5a9639366e2ad`
- **Line count:** 47
- **Read range:** `1-47`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import RemindersPage from "./page";`
- `26: const html = renderToStaticMarkup(await RemindersPage({ params: Promise.resolve({ locale: "en" }) }));`
- `43: const html = renderToStaticMarkup(await RemindersPage({ params: Promise.resolve({ locale: "en" }) }));`
### backend_consumers_or_contracts
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/reminders-server", () => ({ getPatientMedicationReminders: state.getPatientMedicationReminders }));`
### auth_ownership
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `15: const serverToken = "server-only-reminder-token-never-in-html";`
- `20: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `23: it("renders current reminder details only without identifier, patient id, instructions, log, refill metadata, or token", async () => {`
- `28: expect(state.getPatientMedicationReminders).toHaveBeenCalledWith(serverToken);`
- `31: for (const secret of [serverToken, reminderId, "private-patient", "private-instructions", "private-order", "private-lock"]) expect(html).not.toContain(secret);`
- `39: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
### state_transitions
- `4: const state = vi.hoisted(() => ({ getPatientMedicationReminders: vi.fn(), requirePatientAccess: vi.fn() }));`
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/reminders-server", () => ({ getPatientMedicationReminders: state.getPatientMedicationReminders }));`
- `19: state.getPatientMedicationReminders.mockReset();`
- `20: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `24: state.getPatientMedicationReminders.mockResolvedValue(new Response(JSON.stringify({ reminders: [{ id: reminderId, medicine_name_en: "Verified medicine", dose: "1 tablet", times: ["08:00"], frequency: "daily", patient_id: "private-patient", `
- `28: expect(state.getPatientMedicationReminders).toHaveBeenCalledWith(serverToken);`
- `36: describe("empty medication reminders", () => {`
- `38: state.getPatientMedicationReminders.mockReset().mockResolvedValue(new Response(JSON.stringify({ reminders: [] }), { status: 200 }));`
- `39: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `44: expect(html).toContain("empty");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `24: state.getPatientMedicationReminders.mockResolvedValue(new Response(JSON.stringify({ reminders: [{ id: reminderId, medicine_name_en: "Verified medicine", dose: "1 tablet", times: ["08:00"], frequency: "daily", patient_id: "private-patient", `
- `36: describe("empty medication reminders", () => {`
- `44: expect(html).toContain("empty");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
