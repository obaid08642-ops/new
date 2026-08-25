# Phase 0B semantic evidence — Care appointment repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/care/repositories/appointment.repository.ts:1–13`

`AppointmentRepository` is an injectable typed wrapper around `MongoRepository<AppointmentDocument>`, binding `Appointment.name` to `Model<AppointmentDocument>` (`care/repositories/appointment.repository.ts:2–11`). The member defines no appointment-specific methods or invariants: no patient/provider/facility/tenant scope, participant authorization, slot conflict/capacity lock, state transition command, payment/insurance reconciliation, minimum-necessary projection, clinical privacy boundary, optimistic concurrency, idempotency, retention/deletion/anonymization, audit/provenance or transactional boundary. Generic inherited operations therefore leave the care-appointment lifecycle, schedule truth and patient/provider privacy entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
