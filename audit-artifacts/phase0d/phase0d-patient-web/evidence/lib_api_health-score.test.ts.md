# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/health-score.test.ts`
- **Member SHA-256:** `a47011e2f64ae8a49846d5968e938a8ce588810f9e89ff23f2ebf06b0cc93c98`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `6: expect(parseHealthScore({ score: 82, status: "calculated", recommendations: ["private clinical advice"], patient_id: "private", components: [{ key: "bmi", score: 82, detail: { bmi: 31.2 }, recommendation: "private" }] })).toEqual({ score: 8`
- `8: it("keeps an honest insufficient-data state", () => {`
- `9: expect(parseHealthScore({ score: null, status: "insufficient_data", recommendations: ["do not expose"] })).toEqual({ score: null, status: "insufficient_data", components: [] });`
- `11: it("rejects malformed payloads", () => { expect(parseHealthScore({ score: "82", status: "calculated" })).toBeNull(); });`
### payment_insurance_relevance
- `11: it("rejects malformed payloads", () => { expect(parseHealthScore({ score: "82", status: "calculated" })).toBeNull(); });`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
