# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/home-care-services.test.ts`
- **Member SHA-256:** `874b28906f43559c4146d7cf7b9a2cca75c425d0bff5dbbe13f4e3e1b8f17c94`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `2: import { extractHomeCareService, extractHomeCareServices, parseHomeCareServiceId } from "./home-care-services";`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `10: expect(parseHomeCareServiceId("svc-1").success).toBe(true);`
- `11: expect(parseHomeCareServiceId("patient@example.com").success).toBe(false);`
### payment_insurance_relevance
- `6: expect(extractHomeCareServices([{ id: "svc-1", name_ar: "تمريض منزلي", name_en: "Home nursing", description_ar: "وصف", price: 120, duration_value: 2, duration: "hour", insurance_availability: true, patient_id: "private" }])).toMatchObject([`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
