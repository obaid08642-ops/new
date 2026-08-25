# Phase 0B semantic evidence — Unified bookings contract spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/unified-bookings/unified-bookings.contract.spec.ts:1–99`

The spec constructs `UnifiedBookingsService` through `Object.create` with mocked provider, slot, appointment create/cancel/reschedule services and mocked getOne (`8–29`). It verifies cash consultation creation first resolves server slots, rejects unsupported card identifiers before slot/appointment calls, rejects an arbitrary slot absent from the availability response, maps a listed unavailable slot to `ConflictException`, and checks owner-scoped lookup prevents cancellation of a foreign booking (`31–92`). It also verifies reflection metadata requiring idempotency on root create/cancel/reschedule controller methods (`94–97`).

The tests encode useful slot and ownership intent, but are mock/prototype-bound and do not execute HTTP guards or live services. Card payment intent is rejected rather than tested as a published payment flow; no payment authorization/capture/refund truthfulness is established. No atomic slot acquisition, duplicate/replay behavior, concurrent race, transaction/compensation, reschedule semantics, call-token, notification, provider/tenant isolation, unauthenticated behavior, malformed DTO/range/timezone validation, status/payment projection or live backend contract is tested. Idempotency is metadata-only, not replay behavior. No code was changed and no build/test/application operation was performed during this read.
