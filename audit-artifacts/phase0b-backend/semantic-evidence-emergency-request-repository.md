# Phase 0B semantic evidence — EmergencyRequest repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/emergency/repositories/emergencyrequest.repository.ts:1–13`

`EmergencyRequestRepository` is an injectable class extending the shared generic `MongoRepository<EmergencyRequestDocument>` and injects the Mongoose model for `EmergencyRequest` before passing it to the base repository (`1–13`). The member contains no emergency-specific query, projection, ownership, actor, facility/vehicle/location scope, status transition, optimistic concurrency, transaction or audit logic (`8–13`).

The model binding establishes the repository's collection abstraction but all emergency-specific safety depends on the shared repository, service and controllers. This member does not prove patient ownership, dispatch authority, responder assignment, emergency visibility minimization, exact location handling, idempotent trigger/cancel/resolve operations, duplicate suppression, expiry or retention. A comment says “Ensure correct import” without an enforcement mechanism (`5–6`). No code was changed and no build/test/application operation was performed during this read.
