# Semantic evidence — Mobile consultation search and booking confirmation

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Doctor search

`audit-work/source/nabd_plus_patient_app/app/consultations/doctor-search.tsx:29–196` calls `GET /care/doctors` with `search` and `sort`, maps server fields without invented rating/price/wait/experience values, shows loading and empty states, and routes each card to `/consultations/doctor/[id]` or `/consultations/book/[id]`. It is `@ts-nocheck` and catches all fetch errors as an empty result, so unavailable and genuinely empty are conflated. Search filtering is applied again client-side to localized name/specialty.

## Booking confirmation

`booking-confirm.tsx:26–254` supports visit types video/clinic/home and payment choices. It reads `/insurance/companies`, `/insurance/companies/{id}/networks`, `/care/doctors/{doctorId}`, and `/users/me/profile`. Insurance coverage is fetched using a manually constructed `fetch` call and token from SecureStore/AsyncStorage (`:110–142`), rather than the shared transport; base URL replacement contains a localhost fallback (`:122`), requiring environment/transport verification.

Price is derived from server doctor mode prices with null→zero behavior (`:144–150`). The confirm action posts `/care/appointments` (`:183–198`), then card calls `/payments/intent/consultation/{id}` with payment idempotency headers (`:204–225`), insurance posts `/insurance/requests` then routes to `/insurance/payment-split` (`:226–234`), and cash routes directly to booking success (`:235–248`). Guests are allowed to book except insurance (`:163–168`); this must be reconciled with backend authentication and payment/PII policy.

The screen contains a fixed `30 دقيقة` display in the appointment details (`:299–302`), while the request uses server-selected slot and mode; duration authority must be checked. The source does not show a server quote/total response being used for card/insurance; it locally computes VAT and coverage from doctor prices and coverage fields, requiring server-side price/coverage authority verification.

## Cross-layer gaps to trace

1. `GET /care/doctors` and detail payload schema versus Web doctor pages.
2. `/care/appointments` versus `UnifiedBookingsController` consultation bridge and whether both are authoritative.
3. Payment intent amount/expiry/idempotency response versus local totals.
4. Insurance request ownership, coverage authorization, and payment split state machine.
5. Guest booking identity/session and cancellation/refund ownership.
6. Slot lock/race behavior between client slot selection and server create.

No Phase 0 remediation was made.
