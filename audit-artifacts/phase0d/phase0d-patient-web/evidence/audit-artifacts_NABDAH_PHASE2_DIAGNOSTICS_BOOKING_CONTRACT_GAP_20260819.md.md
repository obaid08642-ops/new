# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_DIAGNOSTICS_BOOKING_CONTRACT_GAP_20260819.md`
- **Member SHA-256:** `5eba0dc2e9c88c4b988e38a006d83ba746f5e9b835ea3a48aa49a17b0570704a`
- **Line count:** 24
- **Read range:** `1-24`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Phase 2 Patient — diagnostics booking contract gap`
- `5: This review compares `patient/nabd_plus/app/diagnostics/booking-confirm.tsx` with the effective Backend lab booking flow in `backend/src/modules/labs/labs.controller.ts` and `labs.service.ts`. The route itself is valid: Patient calls `POST `
- `9: | Offers `wallet` in UI payment options | Backend accepts only `cash`, `card`, `insurance`; another value is normalized to `cash` | Patient can display wallet while booking is silently stored as cash | **FIX — block wallet option unless a r`
- `11: | Supplies fixed `50` home fee and locally calculated `15%` VAT | Backend derives item prices server-side and adds a fixed `25` home amount, with no VAT field in this service | UI total can disagree with persisted booking total | **FIX — re`
- `12: | Builds `scheduled_at` as `Date.now()+24h` | Backend accepts the timestamp then checks capacity; it does not select a provider availability slot for Patient | A booking can be submitted for an arbitrary, non-user-selected slot | **FIX/BLOC`
- `13: | Uses `params.labId || 'provider_lab_default'` | Backend requires a provider ID for patient bookings but does not make this placeholder a legitimate selected provider | A placeholder may bypass the non-empty check and create a misrouted/in`
- `14: | Sends a hardcoded Jeddah address/coordinates and displays a different hardcoded address | Backend persists supplied address | A real home sample request can contain fabricated location data | **P0 FIX — bind selected saved address/GPS onl`
- `15: | Sends an `example.com` doctor request to satisfy home-insurance proof | Backend requires a document with `doctor_request` or `preauth` kind for home insurance | The example URL can satisfy a safety/business prerequisite without a real upl`
- `16: | Clears lab/radiology cart after booking creation and shows card flow as “confirm and pay” | This flow creates a booking; no payment-intent/pending-payment step is invoked in this screen | Cart and booking state can advance before a valid `
- `20: The Backend enforces patient booking provider presence, home/payment-method policy, home-service eligibility, insurance-home proof, future slot checks, capacity controls, and three-minute same-patient/service-set idempotency. These controls`
- `24: `diagnostics/booking-confirm.tsx` must remain **blocked from live activation** until the listed contract mappings and data sources are fixed and tested. The intended journey (cart → real provider/slot/address → insurance or cash/card paymen`
### backend_consumers_or_contracts
- `5: This review compares `patient/nabd_plus/app/diagnostics/booking-confirm.tsx` with the effective Backend lab booking flow in `backend/src/modules/labs/labs.controller.ts` and `labs.service.ts`. The route itself is valid: Patient calls `POST `
- `16: | Clears lab/radiology cart after booking creation and shows card flow as “confirm and pay” | This flow creates a booking; no payment-intent/pending-payment step is invoked in this screen | Cart and booking state can advance before a valid `
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `10: | Sends `insurance_company` and `member_id` | Backend persists `insurance_provider` and `insurance_member_id` | Insurance identity data is dropped/misclassified; pending insurance event may use `unknown_provider` | **FIX — map to exact Back`
- `13: | Uses `params.labId || 'provider_lab_default'` | Backend requires a provider ID for patient bookings but does not make this placeholder a legitimate selected provider | A placeholder may bypass the non-empty check and create a misrouted/in`
- `16: | Clears lab/radiology cart after booking creation and shows card flow as “confirm and pay” | This flow creates a booking; no payment-intent/pending-payment step is invoked in this screen | Cart and booking state can advance before a valid `
- `24: `diagnostics/booking-confirm.tsx` must remain **blocked from live activation** until the listed contract mappings and data sources are fixed and tested. The intended journey (cart → real provider/slot/address → insurance or cash/card paymen`
### payment_insurance_relevance
- `5: This review compares `patient/nabd_plus/app/diagnostics/booking-confirm.tsx` with the effective Backend lab booking flow in `backend/src/modules/labs/labs.controller.ts` and `labs.service.ts`. The route itself is valid: Patient calls `POST `
- `9: | Offers `wallet` in UI payment options | Backend accepts only `cash`, `card`, `insurance`; another value is normalized to `cash` | Patient can display wallet while booking is silently stored as cash | **FIX — block wallet option unless a r`
- `10: | Sends `insurance_company` and `member_id` | Backend persists `insurance_provider` and `insurance_member_id` | Insurance identity data is dropped/misclassified; pending insurance event may use `unknown_provider` | **FIX — map to exact Back`
- `11: | Supplies fixed `50` home fee and locally calculated `15%` VAT | Backend derives item prices server-side and adds a fixed `25` home amount, with no VAT field in this service | UI total can disagree with persisted booking total | **FIX — re`
- `15: | Sends an `example.com` doctor request to satisfy home-insurance proof | Backend requires a document with `doctor_request` or `preauth` kind for home insurance | The example URL can satisfy a safety/business prerequisite without a real upl`
- `16: | Clears lab/radiology cart after booking creation and shows card flow as “confirm and pay” | This flow creates a booking; no payment-intent/pending-payment step is invoked in this screen | Cart and booking state can advance before a valid `
- `20: The Backend enforces patient booking provider presence, home/payment-method policy, home-service eligibility, insurance-home proof, future slot checks, capacity controls, and three-minute same-patient/service-set idempotency. These controls`
- `24: `diagnostics/booking-confirm.tsx` must remain **blocked from live activation** until the listed contract mappings and data sources are fixed and tested. The intended journey (cart → real provider/slot/address → insurance or cash/card paymen`
### error_empty_loading_retry_cancel
- `10: | Sends `insurance_company` and `member_id` | Backend persists `insurance_provider` and `insurance_member_id` | Insurance identity data is dropped/misclassified; pending insurance event may use `unknown_provider` | **FIX — map to exact Back`
- `13: | Uses `params.labId || 'provider_lab_default'` | Backend requires a provider ID for patient bookings but does not make this placeholder a legitimate selected provider | A placeholder may bypass the non-empty check and create a misrouted/in`
- `16: | Clears lab/radiology cart after booking creation and shows card flow as “confirm and pay” | This flow creates a booking; no payment-intent/pending-payment step is invoked in this screen | Cart and booking state can advance before a valid `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
