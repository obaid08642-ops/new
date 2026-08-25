# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/profile-security.test.ts`
- **Member SHA-256:** `2f0b88cd09d4a4cf30fb953a7b0a5936f7e0cea3201c6497f6b264df5b29a6fe`
- **Line count:** 13
- **Read range:** `1-13`
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
- `6: const record = extractRecord({ data: { providerName: "Example Insurance", companyName: "Example", status: "active", policyNumber: "private-policy", memberId: "private-member" } });`
- `7: expect(readProfileFields(record, ["providerName", "companyName", "status"])).toEqual([`
- `10: { key: "status", value: "active" },`
### payment_insurance_relevance
- `5: it("does not expose insurance identifiers through the web display allowlist", () => {`
- `6: const record = extractRecord({ data: { providerName: "Example Insurance", companyName: "Example", status: "active", policyNumber: "private-policy", memberId: "private-member" } });`
- `8: { key: "providerName", value: "Example Insurance" },`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
