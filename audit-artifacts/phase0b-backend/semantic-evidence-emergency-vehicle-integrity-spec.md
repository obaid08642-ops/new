# Phase 0B semantic evidence — Emergency vehicle integrity spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/emergency/emergency.service.vehicle-integrity.spec.ts:1–36`

This Jest unit spec constructs `EmergencyService` with mocked emergency model, vehicle queries, connection and event emitter (`4–13`). It verifies fail-closed behavior when a provider claims without a vehicle, rejects an absent/unapproved/unavailable vehicle outside the authenticated provider fleet, and binds a successful claim to the approved vehicle and provider while writing the vehicle plate label (`15–35`).

These tests provide focused evidence for requiring a named vehicle, provider-account scoping, approved status, availability and avoiding use of the caller ID as the vehicle ID. The model and vehicle data are mocks; no actual auth guard/session, provider licensing, vehicle ownership database constraint, fleet tenancy, emergency ownership, state transition, location integrity, assignment race, transaction, idempotency, notification/audit or live dispatch behavior is proven (`5–35`).

The successful fixture lacks `status`/`is_available` fields even though the lookup contract requires them, and `updateOne` returns a fixed object without asserting filter ownership/version or affected count (`6–11,28–34`). There is no test for double claim, stale availability, concurrent claims, vehicle deactivation/revocation, plate privacy, malformed IDs, cancellation/resolve/no-show, responder permissions, exact location handling or dependency failure. No test was run and no product code was changed during this semantic read.
