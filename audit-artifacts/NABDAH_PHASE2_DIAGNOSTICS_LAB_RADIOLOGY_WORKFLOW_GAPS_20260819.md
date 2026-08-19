# Phase 2 Patient — diagnostics, laboratory, and radiology workflow gaps

## Confirmed Backend protections and compatible behavior

`POST /labs/bookings` performs service validation, server total calculation, past-slot/capacity checks, duplicate suppression, and creates an insurance-pending state only when insurance fields are actually sent. Lab booking reads are patient-scoped in the lab service. These controls are **PASS** for the paths that use them.

## Confirmed client workflow defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Afternoon diagnostics appointments are serialized as morning UTC times | Checkout strips Arabic `ص`/`م` from `٠٤:٠٠ م` and constructs `YYYY-MM-DDT04:00:00Z`; it neither adds 12 hours nor constructs time in the selected local service timezone. | Replace display-string parsing with canonical slot IDs/timestamps returned by Backend; add unit tests for AM/PM and DST/timezone boundaries. |
| **P0** | Radiology bookings accept an unvalidated arbitrary client body | `RadiologyOpsService.book` spreads the submitted body into a new booking, without server-side service lookup, price calculation, schedule/slot validation, payment/insurance state setup, safety-questionnaire enforcement, or any ownership/contract normalization. | Implement a validated radiology booking DTO/service equivalent to laboratory controls before accepting patient bookings. |
| **P0** | Radiology booking detail is not ownership-scoped | `RadiologyOpsService.getBooking` returns a booking by ID without checking the requesting patient/provider/admin. Patient `diagnostics/order/[id]` calls this route. | Enforce fail-closed patient/provider/admin ownership on every read, cancellation, document, insurance, technician, report, and transition method; add BOLA tests with patient1/patient2. |
| **P1** | Checkout generates static dates/times rather than real availability | 30 Arabic dates and time slots are synthesized locally; no provider capacity, holiday, modality preparation, travel window, or selected-facility availability is fetched. | Adopt provider/service/location-specific server slots and have the Backend validate the selected slot at booking. |
| **P1** | Home sample booking lacks an address/contact contract | Home booking sends `location_type: home` but no structured address or contact data. Backend supports those fields and dispatches a home-visit event, so an accepted request may not be serviceable. | Require validated selected address/contact and explicit home-service eligibility before submit; render field-level remediation rather than generic failure. |
| **P1** | Checkout advertises insurance but cannot create an insurance booking | It exposes no insurance selector/upload/policy data and always serializes Apple Pay/Visa as `card`; `payment_method: insurance` plus provider/member/documents are never sent. | Link the approved insurance-upload flow to a server-owned insurance booking request, pass only validated policy/document references, and show pending/decision/copay states from Backend. |
| **P1** | Displayed total is client/cart-derived and is cleared before payment confirmation | The UI displays local cart `total`, creates a booking, clears the cart, and shows success; it does not render the returned server quote or create/confirm a payment intent for card/Apple Pay. | Show booking-returned total/fees and state, preserve recovery context until completion, and invoke the canonical payment contract only after owner enables it. |
| **P1** | Radiology safety questionnaire is UI-only | Pregnancy/metal/contrast answers can lock the client UI but are simply included in an arbitrary payload. Server does not validate modality-specific contraindications or record a reviewed safety decision. | Persist and enforce a clinically approved questionnaire contract server-side, with escalation/medical-review rather than a client-only refusal. |
| **P1** | Date/payment/error strings are Arabic/raw and expose unsanitized errors | Checkout is mostly raw Arabic including unsafe error-message interpolation. | Use six-locale keys and safe error codes/messages; never surface raw Backend or payment error text. |

## Decision

Diagnostics is **FIX/BLOCKED** for release. Laboratory contains useful server controls but the current client bypasses necessary availability, address, insurance, and payment sequencing. Radiology requires immediate ownership hardening and a full validated booking contract before patient-facing use.
