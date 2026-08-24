# Phase 0B semantic evidence — LabResultsController

**Archive member:** `src/modules/labs/lab-results.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–15 from the baseline archive extraction.

Lines 1–10 define a JWT-guarded `lab-results` controller backed by `LabResultsService`. Lines 11–14 expose `POST /lab-results` create, `GET /lab-results/mine`, `GET /lab-results/by-booking/:bid`, and `GET /lab-results/:id`. The create body is untyped and has no visible `RequireIdempotency`; all routes delegate current user and ownership behavior to the service.

**Auth/ownership:** controller-level JWT guard; result ownership and booking linkage are service-dependent. The route shape supports owner-scoped mine/by-booking/detail reads, but this member alone does not prove stranger 404 behavior.

**State/payment:** no payment or insurance logic is visible. Mutation is result creation only.

**Test implications:** unauth 401; owner/stranger 404 or equivalent non-disclosure for by-booking/detail; create payload validation and replay/idempotency; patient/provider/admin role matrix; result privacy and booking linkage. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
