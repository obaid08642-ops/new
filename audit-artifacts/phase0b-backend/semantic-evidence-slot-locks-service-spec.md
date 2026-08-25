# Phase 0B semantic evidence — SlotLocksService spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/slot-locks/slot-locks.service.spec.ts:1–64`

The spec compiles `SlotLocksService` with only a mocked `SlotLock` model exposing `deleteMany`, `findOne`, `create` and `find` (`10–26`). It tests rejection of missing provider ID/slot-start input (`28–32`), creation when the mocked collision query returns null (`34–51`), and `slot_taken` when the mocked query returns a lock belonging to another patient (`53–62`).

The test does not provide slot_end, expires_at, booking_id or an idempotency key in the successful/collision requests. It does not assert the exact collision interval query, status filtering, expiry cleanup criteria, provider/patient/booking ownership, booking-kind validation, slot ordering/timezone/duration, partial uniqueness, atomic/CAS behavior under concurrency, duplicate retry, confirm/release/expired transitions, unauthorized access, or live Mongo indexes/TTL. `deleteMany`/`findOne`/`create` are mocks, and no actual database or runtime integration is exercised. No code was changed and no build/test/application operation was performed during this read.
