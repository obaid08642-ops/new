# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/patient-allowlist.test.ts`
- **Member SHA-256:** `6e207070b200d3db21eef32f3dd1695c5f53e8449ef4396546b7c6f006fdd99e`
- **Line count:** 66
- **Read range:** `1-66`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: expect(isAllowedPatientApiPath("/cart/checkout")).toBe(true);`
- `53: expect(isAllowedPatientApiPath("/cart/checkout/payment")).toBe(false);`
### backend_consumers_or_contracts
- `9: expect(isAllowedPatientApiPath("/orders/mine")).toBe(true);`
- `11: isAllowedPatientApiPath("/orders/91047ef2-ad36-422a-a184-629693e7c729")`
- `13: expect(isAllowedPatientApiPath("/patient/pharmacy/orders")).toBe(true);`
- `14: expect(isAllowedPatientApiPath(`/patient/pharmacy/orders/${"91047ef2-ad36-422a-a184-629693e7c729"}`)).toBe(true);`
- `15: expect(isAllowedPatientApiPath(`/orders/${"91047ef2-ad36-422a-a184-629693e7c729"}/tracking`)).toBe(true);`
- `18: expect(isAllowedPatientApiPath("/care/appointments/123e4567-e89b-12d3-a456-426614174000")).toBe(true);`
- `27: expect(isAllowedPatientApiRequest("/orders/mine", "GET")).toBe(true);`
- `28: expect(isAllowedPatientApiRequest("/orders/mine", "POST")).toBe(false);`
- `29: expect(isAllowedPatientApiRequest("/patient/pharmacy/orders", "POST")).toBe(false);`
- `30: expect(isAllowedPatientApiRequest("/patient/pharmacy/orders/91047ef2-ad36-422a-a184-629693e7c729", "PATCH")).toBe(false);`
- `31: expect(isAllowedPatientApiRequest("/orders/91047ef2-ad36-422a-a184-629693e7c729/tracking", "POST")).toBe(false);`
- `40: expect(isAllowedPatientApiPath("/orders/not-an-id")).toBe(false);`
### auth_ownership
- `24: it("rejects administrative, provider, unlisted patient domains, and writes", () => {`
- `25: expect(isAllowedPatientApiPath("/admin/users")).toBe(false);`
- `46: expect(isAllowedPatientApiPath("/orders/../admin/users")).toBe(false);`
- `47: expect(isAllowedPatientApiPath("/orders/%2e%2e/admin/users")).toBe(false);`
- `52: expect(isAllowedPatientApiPath("/users/me/wishlist/../admin")).toBe(false);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `53: expect(isAllowedPatientApiPath("/cart/checkout/payment")).toBe(false);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
