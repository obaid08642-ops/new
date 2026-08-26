# Patient Mobile: Nursing / Home-care — manual semantic review

## Reviewed sources

| Source | Scope |
|---|---|
| `app/(tabs)/nursing.tsx` | service/package discovery, payer selector and filter entry |
| `app/nursing/service-info.tsx` | catalog service detail and booking entry |
| `app/nursing/service-details.tsx` | provider discovery and injection gate |
| `app/nursing/nurse-profile.tsx` | service date/time/address/insurance/cash submission |
| `app/nursing/live-tracking.tsx` | visit tracking and completed-care display |
| `app/delivery/address-select.tsx` | saved/current/new address selection dependency |

## Evidence-backed findings

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| PM-NURS-001 | `(tabs)/nursing.tsx:32–39, 80–103, 129–146, 187–215, 219–262` | payment, search and filters are UI state only at hub level; services/packages are not filtered there and payer selection becomes a route parameter, not an eligibility decision | server search/filter and a booking context with payer eligibility; never treat a toggle as insurance approval |
| PM-NURS-002 | `service-info.tsx:26–58, 80–99, 128–138`; `service-details.tsx:32–52, 74–79, 134–158` | catalog/provider data is read, but advertised price/insurance/availability is passed into client flow without a provider/slot quote; hero claims licensing, instant response and coverage without proof in the current response | authoritative service/provider availability, credentials and price version; explicit insurer/provider decision before a patient-facing price or confirmation |
| PM-NURS-003 | `service-details.tsx:199–227` | injection/IV policy is a client modal where the patient simply asserts they have a prescription; no document ID, clinical review or server gate is established | verified prescription/medical order, clinical/provider authorization and server-side prohibition before allocation |
| PM-NURS-004 | `nurse-profile.tsx:62–84, 105–149, 207–240` | dates and time slots are generated locally, not read from nurse schedule; recurrence `daysCount` and `transportMode` are not included in booking payload; client computes an estimate from provider price | server availability/slot lock, recurrence/transport DTO, quote and exact appointment/visit state machine |
| PM-NURS-005 | `nurse-profile.tsx:125–149, 276–323` | cash flow sends `POST /home-care/bookings` with `payment_method:'card'` before payment intent/webhook; no idempotency key and live tracking opens as soon as an ID is returned | cash/card payment intent after service/provider/slot selection and before confirmation; idempotent booking/payment coupling and failure/retry state |
| PM-NURS-006 | `nurse-profile.tsx:86–101, 136–161, 279–288` | insurance uses generic coverage check, creates a booking then displays insurance-request success even when no booking ID is returned; no decision/co-pay/payment/confirmed booking path exists | insurance request → provider/payer decision → authoritative co-pay → patient payment → confirmed visit + notification; tracked request ID and negative states |
| PM-NURS-007 | `live-tracking.tsx:80–95, 97–136, 143–274` | tracking calls `/nursing/visits/:id/tracking` while booking calls `/home-care/bookings`; route compatibility is unproven. Client route `type` changes operational wording, direct phone/Directions actions are shown from tracking data, and completed screen claims rating but routes home without submitting one | canonical owned visit tracking contract with event version, role/ownership, call privacy and safety states; real rating/report access and no route-param-controlled operational role |
| PM-NURS-008 | `address-select.tsx:32–56, 69–150` | saved address list is a real read and selected value is persisted locally, but confirm has no failure feedback and shared map/address creation is delegated outside this source | audit shared picker/address create before production; scoped saved address ID in booking DTO, server geofence/serviceability check and recovery UI |

## Conclusion

Nursing/Home-care has genuine catalog/provider reads, but it does not enforce the owner-required booking chain. It fabricates availability by generating slots, creates cash bookings before payment, lacks repeat/transport data in the DTO, and lacks a complete insurance decision/co-pay/payment branch. Live tracking has some real polling behavior but must be reconciled with the canonical booking contract before it can be treated as safe clinical/PHI functionality.
