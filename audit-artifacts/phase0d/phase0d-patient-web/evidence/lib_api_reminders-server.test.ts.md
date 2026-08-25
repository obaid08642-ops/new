# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/reminders-server.test.ts`
- **Member SHA-256:** `06ed5f10b5c2cc92db9fc2bb5eeb3f3bc59eee36a6b5c1a36e22f49dfd7d40cb`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `4: vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));`
### auth_ownership
- `9: it("uses the active reminder list path and server token", async () => {`
- `12: await getPatientMedicationReminders("server-token");`
- `13: expect(callPatientApi).toHaveBeenCalledWith("/health/reminders", {}, "server-token");`
### state_transitions
- `10: const response = new Response(null, { status: 200 });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
