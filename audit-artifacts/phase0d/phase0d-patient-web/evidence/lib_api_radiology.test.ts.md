# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/radiology.test.ts`
- **Member SHA-256:** `3f0be5a898f21250a2b80c8e0a1d2b53c9276b1b8c8217c4fac1846e78cd8ec3`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: const [service] = extractRadiologyServices([{ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", name_ar: "أشعة سينية - صدر", modality: "xray", body_part: "chest", price: 90, popularity: 95, patient_id: "private", booking_url: "must-n`
- `8: expect(service).not.toHaveProperty("patient_id"); expect(service).not.toHaveProperty("booking_url");`
### backend_consumers_or_contracts
- `2: import { extractRadiologyServices, parseRadiologyServiceId } from "./radiology";`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `10: it("accepts only bounded public identifiers", () => { expect(parseRadiologyServiceId("6a7600a27b25eeca204de283").success).toBe(true); expect(parseRadiologyServiceId("https://evil.test").success).toBe(false); });`
### payment_insurance_relevance
- `6: const [service] = extractRadiologyServices([{ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", name_ar: "أشعة سينية - صدر", modality: "xray", body_part: "chest", price: 90, popularity: 95, patient_id: "private", booking_url: "must-n`
- `7: expect(service).toMatchObject({ id: "6a7600a27b25eeca204de283", nameEn: "Chest X-Ray", modality: "xray", bodyPart: "chest", price: 90 });`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
