# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/claims.test.ts`
- **Member SHA-256:** `0ca10f77b9b801d7e71bbb2d7a65fe78c2137f13d01695788c9735ad77e4d306`
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
- `6: expect(parseClaims({ data: [{ id: "claim-1", service: "Lab", status: "approved", date: "2026-08-20", patient_id: "private", amount: 500, covered: 400, documents: [{ url: "private" }] }] })).toEqual([{ id: "claim-1", service: "Lab", status: `
- `10: expect(parseClaims([{ id: "", service: "Lab" }, { id: "claim-2", status: "unknown" }])).toEqual([]);`
### payment_insurance_relevance
- `4: describe("insurance claim response guards", () => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
