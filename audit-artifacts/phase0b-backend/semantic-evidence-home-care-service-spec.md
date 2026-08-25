# Phase 0B semantic evidence — HomeCareSvc spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/home-care/home-care.service.spec.ts:1–86`

The spec builds HomeCareSvc with mocked repositories for service catalog, bookings, nursing visit reports, care plans and medical supply requests, plus mocked EventEmitter2 and WorkflowEngineService (`8–59`). It asserts DI construction (`61–63`). It has one check-in scenario: a confirmed booking with patient_id and empty state history, a mocked nursing visit report creation, and a nurse actor with latitude/longitude; it asserts a visit result and visit id (`65–84`).

The suite is DI/mock-only and directly calls `checkIn`; it does not prove HTTP authentication, nurse identity/credential/assignment, patient/facility/tenant ownership or live persistence (`38–84`). GPS values are passed but there is no geofence, coordinate range/precision, spoofing, timestamp or distance-to-address assertion (`65–83`). Only confirmed state is covered; pending/assigned/in-transit/completed/cancelled/expired/emergency transitions, duplicate check-in, concurrent check-in, stale booking and check-in window are absent (`67–83`). The mocked workflow engine simply runs a mutate callback and does not prove transaction/CAS/rollback or cross-collection atomicity (`31–35,65–84`). Service catalog, care plan and medical supply repositories are injected but unused (`48–52`). No visit report completeness, clinical notes/PHI projection, consent, signatures/photos, provider safety, notification/event/cache, rate limit, idempotency, audit, retention/DSAR, payment/price/insurance or live Mongo/dispatch evidence exists. No code was changed and no build/test/application operation was performed during this read.
