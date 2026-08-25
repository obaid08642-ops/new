# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/insurance.test.ts`
- **Member SHA-256:** `7691314effcebd303e765dfd50ee2f9a653277a82679ec1e55eb10dbaa71d2d1`
- **Line count:** 3
- **Read range:** `1-3`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `2: import { parseInsuranceSummary } from "./insurance";`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `2: import { parseInsuranceSummary } from "./insurance";`
- `3: describe("insurance parser", () => { it("keeps only the limited policy summary", () => { expect(parseInsuranceSummary({ has_policy: true, policy: { company_name: "Verified insurer", plan_class: "Gold", policy_number: "private-policy", membe`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
