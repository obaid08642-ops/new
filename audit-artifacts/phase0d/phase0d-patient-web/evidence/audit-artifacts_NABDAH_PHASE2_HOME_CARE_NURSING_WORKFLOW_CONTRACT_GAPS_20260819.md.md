# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_HOME_CARE_NURSING_WORKFLOW_CONTRACT_GAPS_20260819.md`
- **Member SHA-256:** `9bb0c7d5ab29bd283aa8bfd1f580ced7b0b780a164bf3d79e8c29fc60d798064`
- **Line count:** 24
- **Read range:** `1-24`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The canonical `POST /home-care/bookings` endpoint authenticates a patient, requires an active service and a schedule, creates an owned `HomeCareBooking`, and persists a state-history record. Both the compatibility booking module and `GET /n`
- `11: | **P0** | Multi-day service is presented but not ordered | The screen lets a patient choose 1–20 days and multiplies a client price, but does not send `sessions_count`/recurrence data. Backend creates the default single session with server`
- `12: | **P0** | Insurance booking claims a submission that never occurs | The client calls a generic coverage check, sends only `payment_method: insurance`, then displays “sent to insurer.” Booking creation does not create an insurance request, `
- `13: | **P0** | Patient is sent to live tracking before assignment, acceptance, or payment | Cash/card booking immediately routes to tracking once an ID returns. Backend creates `NEW_REQUEST`, unassigned, without a payment intent/confirmation. |`
- `14: | **P1** | Availability and schedule are fabricated in the booking UI | The page synthesizes 30 calendar days and fixed Arabic times, without service/provider availability, holidays, timezone, capacity, or slot validation. | Supply server-a`
- `15: | **P1** | Client shows a price and transport choice that do not define the booking | `daysCount` and `transportMode` change displayed behavior/price but are absent from the payload. Backend ignores client `provider_id` too, creating an una`
- `16: | **P1** | Tracking destination cannot be derived from created booking | Client sends a formatted address string; tracking calculates destination from `patient_location`, which the booking contract does not populate. ETA and destination mar`
- `17: | **P1** | Provider profile rendering is unsafe and partially unsupported | UI expects `name`, `facility`, `rating`, `degree`, and `reviews[0]`; the canonical profile response has differently named fields and no review payload. An empty/mis`
- `18: | **P1** | Error and empty-state behavior is not truthful | Provider-load failure leaves an indefinite spinner; tracking swallows all failures and appears to be loading forever. | Render separate unavailable, unauthorized, retry, no-provide`
- `20: | **P2** | Completion route promises a rating that it does not open | “Rate the visit” simply routes home rather than opening a verified, owned rating flow. | Implement or remove the claim; only permit rating after server-confirmed completi`
- `24: The patient’s home-care booking/tracking workflow is **FIX/BLOCKED**. It must not be accepted as end-to-end operational while it can present unrequested multi-day care, false insurance submission, unsupported provider/transport choices, and`
### backend_consumers_or_contracts
- `5: The canonical `POST /home-care/bookings` endpoint authenticates a patient, requires an active service and a schedule, creates an owned `HomeCareBooking`, and persists a state-history record. Both the compatibility booking module and `GET /n`
### auth_ownership
- `5: The canonical `POST /home-care/bookings` endpoint authenticates a patient, requires an active service and a schedule, creates an owned `HomeCareBooking`, and persists a state-history record. Both the compatibility booking module and `GET /n`
- `11: | **P0** | Multi-day service is presented but not ordered | The screen lets a patient choose 1–20 days and multiplies a client price, but does not send `sessions_count`/recurrence data. Backend creates the default single session with server`
- `19: | **P1** | Hard-coded Arabic and visual values continue throughout the flow | Dates, time labels, payment labels, errors, navigation, tracking labels, and many colours/styles are raw or fixed. | Complete six-language keys, RTL/LTR visual te`
### state_transitions
- `3: ## Confirmed Backend controls`
- `5: The canonical `POST /home-care/bookings` endpoint authenticates a patient, requires an active service and a schedule, creates an owned `HomeCareBooking`, and persists a state-history record. Both the compatibility booking module and `GET /n`
- `7: ## Confirmed Patient workflow defects`
- `12: | **P0** | Insurance booking claims a submission that never occurs | The client calls a generic coverage check, sends only `payment_method: insurance`, then displays “sent to insurer.” Booking creation does not create an insurance request, `
- `13: | **P0** | Patient is sent to live tracking before assignment, acceptance, or payment | Cash/card booking immediately routes to tracking once an ID returns. Backend creates `NEW_REQUEST`, unassigned, without a payment intent/confirmation. |`
- `16: | **P1** | Tracking destination cannot be derived from created booking | Client sends a formatted address string; tracking calculates destination from `patient_location`, which the booking contract does not populate. ETA and destination mar`
- `17: | **P1** | Provider profile rendering is unsafe and partially unsupported | UI expects `name`, `facility`, `rating`, `degree`, and `reviews[0]`; the canonical profile response has differently named fields and no review payload. An empty/mis`
- `18: | **P1** | Error and empty-state behavior is not truthful | Provider-load failure leaves an indefinite spinner; tracking swallows all failures and appears to be loading forever. | Render separate unavailable, unauthorized, retry, no-provide`
- `19: | **P1** | Hard-coded Arabic and visual values continue throughout the flow | Dates, time labels, payment labels, errors, navigation, tracking labels, and many colours/styles are raw or fixed. | Complete six-language keys, RTL/LTR visual te`
- `20: | **P2** | Completion route promises a rating that it does not open | “Rate the visit” simply routes home rather than opening a verified, owned rating flow. | Implement or remove the claim; only permit rating after server-confirmed completi`
### payment_insurance_relevance
- `11: | **P0** | Multi-day service is presented but not ordered | The screen lets a patient choose 1–20 days and multiplies a client price, but does not send `sessions_count`/recurrence data. Backend creates the default single session with server`
- `12: | **P0** | Insurance booking claims a submission that never occurs | The client calls a generic coverage check, sends only `payment_method: insurance`, then displays “sent to insurer.” Booking creation does not create an insurance request, `
- `13: | **P0** | Patient is sent to live tracking before assignment, acceptance, or payment | Cash/card booking immediately routes to tracking once an ID returns. Backend creates `NEW_REQUEST`, unassigned, without a payment intent/confirmation. |`
- `15: | **P1** | Client shows a price and transport choice that do not define the booking | `daysCount` and `transportMode` change displayed behavior/price but are absent from the payload. Backend ignores client `provider_id` too, creating an una`
- `17: | **P1** | Provider profile rendering is unsafe and partially unsupported | UI expects `name`, `facility`, `rating`, `degree`, and `reviews[0]`; the canonical profile response has differently named fields and no review payload. An empty/mis`
- `19: | **P1** | Hard-coded Arabic and visual values continue throughout the flow | Dates, time labels, payment labels, errors, navigation, tracking labels, and many colours/styles are raw or fixed. | Complete six-language keys, RTL/LTR visual te`
- `24: The patient’s home-care booking/tracking workflow is **FIX/BLOCKED**. It must not be accepted as end-to-end operational while it can present unrequested multi-day care, false insurance submission, unsupported provider/transport choices, and`
### error_empty_loading_retry_cancel
- `12: | **P0** | Insurance booking claims a submission that never occurs | The client calls a generic coverage check, sends only `payment_method: insurance`, then displays “sent to insurer.” Booking creation does not create an insurance request, `
- `17: | **P1** | Provider profile rendering is unsafe and partially unsupported | UI expects `name`, `facility`, `rating`, `degree`, and `reviews[0]`; the canonical profile response has differently named fields and no review payload. An empty/mis`
- `18: | **P1** | Error and empty-state behavior is not truthful | Provider-load failure leaves an indefinite spinner; tracking swallows all failures and appears to be loading forever. | Render separate unavailable, unauthorized, retry, no-provide`
- `19: | **P1** | Hard-coded Arabic and visual values continue throughout the flow | Dates, time labels, payment labels, errors, navigation, tracking labels, and many colours/styles are raw or fixed. | Complete six-language keys, RTL/LTR visual te`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
