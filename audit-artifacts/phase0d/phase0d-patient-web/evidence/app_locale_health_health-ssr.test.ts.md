# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/health/health-ssr.test.ts`
- **Member SHA-256:** `dad4c31000f77325cd410e28c2f67bf68f87cea34b6e3e481da006628fb6143b`
- **Line count:** 46
- **Read range:** `1-46`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));`
- `13: import HealthPage from "./page";`
- `26: const html = renderToStaticMarkup(await HealthPage({ params: Promise.resolve({ locale: "en" }) }));`
- `40: const html = renderToStaticMarkup(await HealthPage({ params: Promise.resolve({ locale: "en" }) }));`
### backend_consumers_or_contracts
- `10: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `11: vi.mock("@/lib/api/vitals-server", () => ({ getPatientVitalSummary: state.getPatientVitalSummary }));`
### auth_ownership
- `6: vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));`
- `10: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `15: const serverToken = "server-only-vitals-token-never-in-html";`
- `20: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `23: it("renders the allowed measurement only without patient id, source, notes, or token", async () => {`
- `28: expect(state.getPatientVitalSummary).toHaveBeenCalledWith(serverToken);`
- `30: expect(html).not.toContain(serverToken);`
- `44: expect(html).not.toContain(serverToken);`
### state_transitions
- `4: const state = vi.hoisted(() => ({ getPatientVitalSummary: vi.fn(), requirePatientAccess: vi.fn() }));`
- `10: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `11: vi.mock("@/lib/api/vitals-server", () => ({ getPatientVitalSummary: state.getPatientVitalSummary }));`
- `19: state.getPatientVitalSummary.mockReset();`
- `20: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `24: state.getPatientVitalSummary.mockResolvedValue(new Response(JSON.stringify([{ key: "heart_rate", value: "72", unit: "bpm", measured_at: "2026-08-20T10:00:00.000Z", patient_id: "private-patient", source: "private-device", notes: "private-not`
- `28: expect(state.getPatientVitalSummary).toHaveBeenCalledWith(serverToken);`
- `37: it("shows the unavailable state when the upstream connection fails instead of treating it as empty data", async () => {`
- `38: state.getPatientVitalSummary.mockRejectedValue(new TypeError("network timeout"));`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `37: it("shows the unavailable state when the upstream connection fails instead of treating it as empty data", async () => {`
- `38: state.getPatientVitalSummary.mockRejectedValue(new TypeError("network timeout"));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
