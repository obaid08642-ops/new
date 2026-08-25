# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_DIAGNOSTICS_LAB_RADIOLOGY_WORKFLOW_GAPS_20260819.md`
- **Member SHA-256:** `a9dd7fc2a4f3e910e1dd519ab89b00d4cb6271f8a5d0e693c4d3e297e081a87c`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: `POST /labs/bookings` performs service validation, server total calculation, past-slot/capacity checks, duplicate suppression, and creates an insurance-pending state only when insurance fields are actually sent. Lab booking reads are patien`
- `11: | **P0** | Afternoon diagnostics appointments are serialized as morning UTC times | Checkout strips Arabic `ص`/`م` from `٠٤:٠٠ م` and constructs `YYYY-MM-DDT04:00:00Z`; it neither adds 12 hours nor constructs time in the selected local serv`
- `12: | **P0** | Radiology bookings accept an unvalidated arbitrary client body | `RadiologyOpsService.book` spreads the submitted body into a new booking, without server-side service lookup, price calculation, schedule/slot validation, payment/i`
- `13: | **P0** | Radiology booking detail is not ownership-scoped | `RadiologyOpsService.getBooking` returns a booking by ID without checking the requesting patient/provider/admin. Patient `diagnostics/order/[id]` calls this route. | Enforce fail`
- `14: | **P1** | Checkout generates static dates/times rather than real availability | 30 Arabic dates and time slots are synthesized locally; no provider capacity, holiday, modality preparation, travel window, or selected-facility availability i`
- `15: | **P1** | Home sample booking lacks an address/contact contract | Home booking sends `location_type: home` but no structured address or contact data. Backend supports those fields and dispatches a home-visit event, so an accepted request m`
- `16: | **P1** | Checkout advertises insurance but cannot create an insurance booking | It exposes no insurance selector/upload/policy data and always serializes Apple Pay/Visa as `card`; `payment_method: insurance` plus provider/member/documents`
- `17: | **P1** | Displayed total is client/cart-derived and is cleared before payment confirmation | The UI displays local cart `total`, creates a booking, clears the cart, and shows success; it does not render the returned server quote or create`
- `19: | **P1** | Date/payment/error strings are Arabic/raw and expose unsanitized errors | Checkout is mostly raw Arabic including unsafe error-message interpolation. | Use six-locale keys and safe error codes/messages; never surface raw Backend `
- `23: Diagnostics is **FIX/BLOCKED** for release. Laboratory contains useful server controls but the current client bypasses necessary availability, address, insurance, and payment sequencing. Radiology requires immediate ownership hardening and `
### backend_consumers_or_contracts
- `5: `POST /labs/bookings` performs service validation, server total calculation, past-slot/capacity checks, duplicate suppression, and creates an insurance-pending state only when insurance fields are actually sent. Lab booking reads are patien`
- `12: | **P0** | Radiology bookings accept an unvalidated arbitrary client body | `RadiologyOpsService.book` spreads the submitted body into a new booking, without server-side service lookup, price calculation, schedule/slot validation, payment/i`
### auth_ownership
- `12: | **P0** | Radiology bookings accept an unvalidated arbitrary client body | `RadiologyOpsService.book` spreads the submitted body into a new booking, without server-side service lookup, price calculation, schedule/slot validation, payment/i`
- `13: | **P0** | Radiology booking detail is not ownership-scoped | `RadiologyOpsService.getBooking` returns a booking by ID without checking the requesting patient/provider/admin. Patient `diagnostics/order/[id]` calls this route. | Enforce fail`
- `17: | **P1** | Displayed total is client/cart-derived and is cleared before payment confirmation | The UI displays local cart `total`, creates a booking, clears the cart, and shows success; it does not render the returned server quote or create`
- `23: Diagnostics is **FIX/BLOCKED** for release. Laboratory contains useful server controls but the current client bypasses necessary availability, address, insurance, and payment sequencing. Radiology requires immediate ownership hardening and `
### state_transitions
- `3: ## Confirmed Backend protections and compatible behavior`
- `5: `POST /labs/bookings` performs service validation, server total calculation, past-slot/capacity checks, duplicate suppression, and creates an insurance-pending state only when insurance fields are actually sent. Lab booking reads are patien`
- `7: ## Confirmed client workflow defects`
- `12: | **P0** | Radiology bookings accept an unvalidated arbitrary client body | `RadiologyOpsService.book` spreads the submitted body into a new booking, without server-side service lookup, price calculation, schedule/slot validation, payment/i`
- `13: | **P0** | Radiology booking detail is not ownership-scoped | `RadiologyOpsService.getBooking` returns a booking by ID without checking the requesting patient/provider/admin. Patient `diagnostics/order/[id]` calls this route. | Enforce fail`
- `16: | **P1** | Checkout advertises insurance but cannot create an insurance booking | It exposes no insurance selector/upload/policy data and always serializes Apple Pay/Visa as `card`; `payment_method: insurance` plus provider/member/documents`
- `17: | **P1** | Displayed total is client/cart-derived and is cleared before payment confirmation | The UI displays local cart `total`, creates a booking, clears the cart, and shows success; it does not render the returned server quote or create`
- `18: | **P1** | Radiology safety questionnaire is UI-only | Pregnancy/metal/contrast answers can lock the client UI but are simply included in an arbitrary payload. Server does not validate modality-specific contraindications or record a reviewe`
- `19: | **P1** | Date/payment/error strings are Arabic/raw and expose unsanitized errors | Checkout is mostly raw Arabic including unsafe error-message interpolation. | Use six-locale keys and safe error codes/messages; never surface raw Backend `
### payment_insurance_relevance
- `5: `POST /labs/bookings` performs service validation, server total calculation, past-slot/capacity checks, duplicate suppression, and creates an insurance-pending state only when insurance fields are actually sent. Lab booking reads are patien`
- `12: | **P0** | Radiology bookings accept an unvalidated arbitrary client body | `RadiologyOpsService.book` spreads the submitted body into a new booking, without server-side service lookup, price calculation, schedule/slot validation, payment/i`
- `13: | **P0** | Radiology booking detail is not ownership-scoped | `RadiologyOpsService.getBooking` returns a booking by ID without checking the requesting patient/provider/admin. Patient `diagnostics/order/[id]` calls this route. | Enforce fail`
- `16: | **P1** | Checkout advertises insurance but cannot create an insurance booking | It exposes no insurance selector/upload/policy data and always serializes Apple Pay/Visa as `card`; `payment_method: insurance` plus provider/member/documents`
- `17: | **P1** | Displayed total is client/cart-derived and is cleared before payment confirmation | The UI displays local cart `total`, creates a booking, clears the cart, and shows success; it does not render the returned server quote or create`
- `18: | **P1** | Radiology safety questionnaire is UI-only | Pregnancy/metal/contrast answers can lock the client UI but are simply included in an arbitrary payload. Server does not validate modality-specific contraindications or record a reviewe`
- `19: | **P1** | Date/payment/error strings are Arabic/raw and expose unsanitized errors | Checkout is mostly raw Arabic including unsafe error-message interpolation. | Use six-locale keys and safe error codes/messages; never surface raw Backend `
- `23: Diagnostics is **FIX/BLOCKED** for release. Laboratory contains useful server controls but the current client bypasses necessary availability, address, insurance, and payment sequencing. Radiology requires immediate ownership hardening and `
### error_empty_loading_retry_cancel
- `5: `POST /labs/bookings` performs service validation, server total calculation, past-slot/capacity checks, duplicate suppression, and creates an insurance-pending state only when insurance fields are actually sent. Lab booking reads are patien`
- `13: | **P0** | Radiology booking detail is not ownership-scoped | `RadiologyOpsService.getBooking` returns a booking by ID without checking the requesting patient/provider/admin. Patient `diagnostics/order/[id]` calls this route. | Enforce fail`
- `16: | **P1** | Checkout advertises insurance but cannot create an insurance booking | It exposes no insurance selector/upload/policy data and always serializes Apple Pay/Visa as `card`; `payment_method: insurance` plus provider/member/documents`
- `19: | **P1** | Date/payment/error strings are Arabic/raw and expose unsanitized errors | Checkout is mostly raw Arabic including unsafe error-message interpolation. | Use six-locale keys and safe error codes/messages; never surface raw Backend `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
