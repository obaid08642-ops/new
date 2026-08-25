# Phase 0B semantic evidence — Home-care booking repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/home-care/repositories/homecarebooking.repository.ts:1–13`

`HomeCareBookingRepository` is an injectable typed wrapper around `MongoRepository<HomeCareBooking>`, binding `HomeCareBooking.name` to `Model<HomeCareBooking>` (`home-care/repositories/homecarebooking.repository.ts:2–11`). The member defines no booking-specific methods or invariants: no patient/nurse/tenant ownership scope, service/booking relationship checks, schedule/slot conflict protection, status transition commands, payment/insurance reconciliation, minimum-necessary projection, address/insurance redaction, optimistic concurrency, idempotency, retention/deletion/anonymization, audit/provenance or transactional boundary. Generic inherited operations therefore leave the full home-care booking lifecycle and protection of patient location/financial/coverage data to callers. No product code was changed and no tests/builds were executed during this semantic read.
