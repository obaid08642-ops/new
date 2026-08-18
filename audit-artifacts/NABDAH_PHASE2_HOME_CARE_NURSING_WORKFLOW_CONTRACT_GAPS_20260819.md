# Phase 2 Patient — home-care and nursing workflow contract gaps

## Confirmed Backend controls

The canonical `POST /home-care/bookings` endpoint authenticates a patient, requires an active service and a schedule, creates an owned `HomeCareBooking`, and persists a state-history record. Both the compatibility booking module and `GET /nursing/visits/:id/tracking` use the same `HomeCareBooking` model; tracking verifies patient/provider/admin ownership before returning information. These ownership checks are **PASS**.

## Confirmed Patient workflow defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Multi-day service is presented but not ordered | The screen lets a patient choose 1–20 days and multiplies a client price, but does not send `sessions_count`/recurrence data. Backend creates the default single session with server price. | Introduce a canonical multi-session/recurrence quote-and-book contract, or remove the multi-day UI; display only the returned server quote and booking scope. |
| **P0** | Insurance booking claims a submission that never occurs | The client calls a generic coverage check, sends only `payment_method: insurance`, then displays “sent to insurer.” Booking creation does not create an insurance request, policy binding, pending-insurance state, approval, copay intent, or decision. | Replace with an owned insurance-request workflow and state machine; do not show insurer-review success until server has returned a persisted request ID/status. |
| **P0** | Patient is sent to live tracking before assignment, acceptance, or payment | Cash/card booking immediately routes to tracking once an ID returns. Backend creates `NEW_REQUEST`, unassigned, without a payment intent/confirmation. | Route to an honest “request received / awaiting provider” status first; add server-owned payment/cash sequencing and only enable live tracking at an authorized transit state. |
| **P1** | Availability and schedule are fabricated in the booking UI | The page synthesizes 30 calendar days and fixed Arabic times, without service/provider availability, holidays, timezone, capacity, or slot validation. | Supply server-authoritative availability/slots and validate schedule selection on the server; localize date/time display. |
| **P1** | Client shows a price and transport choice that do not define the booking | `daysCount` and `transportMode` change displayed behavior/price but are absent from the payload. Backend ignores client `provider_id` too, creating an unassigned broadcast request. | Remove unsupported choices or add explicit, server-validated contract fields and a returned quote/assignment explanation. |
| **P1** | Tracking destination cannot be derived from created booking | Client sends a formatted address string; tracking calculates destination from `patient_location`, which the booking contract does not populate. ETA and destination marker therefore remain unavailable. | Define canonical structured address/location fields, consent/location retention, and map-safe destination projection; show a truthful no-location state until the provider shares an authorized location. |
| **P1** | Provider profile rendering is unsafe and partially unsupported | UI expects `name`, `facility`, `rating`, `degree`, and `reviews[0]`; the canonical profile response has differently named fields and no review payload. An empty/missing review may crash the screen. | Normalize a patient-safe provider profile DTO, never fabricate ratings/reviews, and handle missing optional data without a blocking loader or crash. |
| **P1** | Error and empty-state behavior is not truthful | Provider-load failure leaves an indefinite spinner; tracking swallows all failures and appears to be loading forever. | Render separate unavailable, unauthorized, retry, no-provider-assigned, and no-location states with safe, localized messages. |
| **P1** | Hard-coded Arabic and visual values continue throughout the flow | Dates, time labels, payment labels, errors, navigation, tracking labels, and many colours/styles are raw or fixed. | Complete six-language keys, RTL/LTR visual tests, and design-token migration as part of the shared UX remediation. |
| **P2** | Completion route promises a rating that it does not open | “Rate the visit” simply routes home rather than opening a verified, owned rating flow. | Implement or remove the claim; only permit rating after server-confirmed completion and one submission per booking. |

## Decision

The patient’s home-care booking/tracking workflow is **FIX/BLOCKED**. It must not be accepted as end-to-end operational while it can present unrequested multi-day care, false insurance submission, unsupported provider/transport choices, and transit tracking before an actual accepted visit.
