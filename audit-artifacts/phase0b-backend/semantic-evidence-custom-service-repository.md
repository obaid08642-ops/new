# Phase 0B semantic evidence — CustomServiceRequest repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/custom-services/repositories/customservicerequest.repository.ts:1–13`

`CustomServiceRequestRepository` is an injectable class extending the shared generic `MongoRepository<CustomServiceRequest>` and injects the Mongoose model by `CustomServiceRequest.name` before passing it to the base repository (`1–13`). It contains no custom methods, projections, filters, ownership checks, provider scope, status transition, price/payment, consent, audit, optimistic concurrency or transaction logic (`8–13`).

The model binding establishes a persistence abstraction only. Patient/provider authorization, request lifecycle, service eligibility, sensitive-field projection, idempotent creation/update/cancellation, duplicate handling and failure behavior must be proven in the shared repository, service and controllers; this member does not establish them. The “Ensure correct import” comment is not an executable integrity control (`5–6`). No code was changed and no build/test/application operation was performed during this read.
