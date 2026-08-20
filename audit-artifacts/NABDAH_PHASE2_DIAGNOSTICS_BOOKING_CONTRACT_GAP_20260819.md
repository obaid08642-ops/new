# Phase 2 Patient — diagnostics booking contract gap

## Scope

This review compares `patient/nabd_plus/app/diagnostics/booking-confirm.tsx` with the effective Backend lab booking flow in `backend/src/modules/labs/labs.controller.ts` and `labs.service.ts`. The route itself is valid: Patient calls `POST /labs/bookings` and Backend exposes `@Post('bookings')` under the labs controller. The finding concerns **payload semantics, pricing, and workflow truthfulness**, not a missing route.

| Patient behavior | Backend contract | Finding | Severity / required disposition |
|---|---|---|---|
| Offers `wallet` in UI payment options | Backend accepts only `cash`, `card`, `insurance`; another value is normalized to `cash` | Patient can display wallet while booking is silently stored as cash | **FIX — block wallet option unless a real wallet booking/payment contract exists** |
| Sends `insurance_company` and `member_id` | Backend persists `insurance_provider` and `insurance_member_id` | Insurance identity data is dropped/misclassified; pending insurance event may use `unknown_provider` | **FIX — map to exact Backend field names and verify manual insurance workflow** |
| Supplies fixed `50` home fee and locally calculated `15%` VAT | Backend derives item prices server-side and adds a fixed `25` home amount, with no VAT field in this service | UI total can disagree with persisted booking total | **FIX — render server quote/booking total only; do not calculate medical-service pricing locally** |
| Builds `scheduled_at` as `Date.now()+24h` | Backend accepts the timestamp then checks capacity; it does not select a provider availability slot for Patient | A booking can be submitted for an arbitrary, non-user-selected slot | **FIX/BLOCKED — require real availability/slot selection before activation** |
| Uses `params.labId || 'provider_lab_default'` | Backend requires a provider ID for patient bookings but does not make this placeholder a legitimate selected provider | A placeholder may bypass the non-empty check and create a misrouted/invalid booking | **FIX — require a real selected provider ID and fail closed when absent** |
| Sends a hardcoded Jeddah address/coordinates and displays a different hardcoded address | Backend persists supplied address | A real home sample request can contain fabricated location data | **P0 FIX — bind selected saved address/GPS only and block home booking when absent** |
| Sends an `example.com` doctor request to satisfy home-insurance proof | Backend requires a document with `doctor_request` or `preauth` kind for home insurance | The example URL can satisfy a safety/business prerequisite without a real uploaded document | **P0 FIX — upload/attach verified stored document only; never synthesize proof** |
| Clears lab/radiology cart after booking creation and shows card flow as “confirm and pay” | This flow creates a booking; no payment-intent/pending-payment step is invoked in this screen | Cart and booking state can advance before a valid payment path exists | **FIX/BLOCKED — define payment state and idempotent sequencing; live card payment remains dependent on Moyasar activation** |

## Backend protections that remain valid

The Backend enforces patient booking provider presence, home/payment-method policy, home-service eligibility, insurance-home proof, future slot checks, capacity controls, and three-minute same-patient/service-set idempotency. These controls do not correct client-side fabricated values that are syntactically accepted.

## Decision

`diagnostics/booking-confirm.tsx` must remain **blocked from live activation** until the listed contract mappings and data sources are fixed and tested. The intended journey (cart → real provider/slot/address → insurance or cash/card payment state → confirmation/tracking) may be retained, but no local fallback, fixed commercial value, or fabricated medical document may reach production.
