# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/mental-health.test.ts`
- **Member SHA-256:** `b9e6e3de85ea7d77447b4fcd3bd94f96cfd3c1bf38d9449e4f082361d6bdc4f6`
- **Line count:** 3
- **Read range:** `1-3`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: describe("mental health wellbeing parser", () => { it("keeps descriptive dashboard stats and drops raw mood/private fields", () => { expect(parseWellbeingDashboard({ mood: { total_entries: 3, avg_mood: 3.2, avg_energy: 2.4, avg_stress: 1.1,`
### state_transitions
- `3: describe("mental health wellbeing parser", () => { it("keeps descriptive dashboard stats and drops raw mood/private fields", () => { expect(parseWellbeingDashboard({ mood: { total_entries: 3, avg_mood: 3.2, avg_energy: 2.4, avg_stress: 1.1,`
### payment_insurance_relevance
- `3: describe("mental health wellbeing parser", () => { it("keeps descriptive dashboard stats and drops raw mood/private fields", () => { expect(parseWellbeingDashboard({ mood: { total_entries: 3, avg_mood: 3.2, avg_energy: 2.4, avg_stress: 1.1,`
### error_empty_loading_retry_cancel
- `3: describe("mental health wellbeing parser", () => { it("keeps descriptive dashboard stats and drops raw mood/private fields", () => { expect(parseWellbeingDashboard({ mood: { total_entries: 3, avg_mood: 3.2, avg_energy: 2.4, avg_stress: 1.1,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
