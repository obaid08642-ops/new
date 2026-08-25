# Phase 0B semantic evidence — UnifiedBookingsService access spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/unified-bookings/unified-bookings.service.spec.ts:1–25`

The spec creates a `UnifiedBookingsService` via `Object.create(UnifiedBookingsService.prototype)`, sets a one-entry kind map for radiology, and supplies a mocked radiology model whose `findOne().lean()` resolves a chosen value (`8–14`). It verifies an owned radiology booking is returned for patient-1 (`16–19`) and that a null result for patient-2 raises `NotFoundException`, described as fail-closed behavior for foreign or missing bookings (`21–24`).

This is a narrow access-contract unit check. It does not prove that the database query itself is ownership-scoped, because the mocked model returns the value independently of requested user; it does not exercise HTTP/controller auth or unauthenticated behavior, other booking kinds, tenant/organization isolation, malformed IDs, service/model failures, response projection, or enumeration resistance. It does not cover booking creation, slot lock, payment intent, cancellation, rescheduling, call token, idempotency/replay, transactionality, notification or live database behavior. No code was changed and no build/test/application operation was performed during this read.
