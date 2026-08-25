# Phase 0B semantic evidence — Approval workflow module

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/approval-workflow/approval-workflow.module.ts:2–219` (the archive begins at line 2; no line 1 was present).

The module imports JWT/role/current-user/audit decorators, approval and catalog schemas, and the publication service (`2–14`). `ApprovalWorkflowService` injects approval-request and medicine/provider/facility/lab/radiology/home-care models as `Model<any>` and publication service (`16–27`). `createRequest` requires `entity_type` and `change_data`, computes the next version by a non-transactional latest-request lookup for an existing entity, then creates a pending request with submitter and version (`29–59`). List methods query pending or submitter-owned requests; details lookup is by request ID alone (`61–73`).

`decide` retrieves the request by ID and rejects already-decided states; rejection records status/reviewer/time/note and saves (`75–97`). Approval merges arbitrary `dto.edit_data` over request data, sets governed projection fields and provenance, selects medicine/provider/facility/lab/home-care/radiology by entity/service type, creates or updates the target model, saves the request and then calls publication refresh with admin actor and an idempotency key (`99–165`).

The controller is JWT-guarded; create/my-requests use current user; pending and decide carry `@Roles(ADMIN)`; decide is audited (`169–199`). However, DTOs are `any` for all bodies/current user, details lacks ownership/role decorator, and service methods rely on callers for authorization (`174–199`). The service uses `Model<any>`, spreads arbitrary edit data into target entities, has no explicit transaction/compare-and-set around target/request/publication writes, and uses a non-null publication type assertion; unknown service types fall through to radiology (`105–115,142–164`). The module registers all seven models and exports the service (`203–219`).

No code was changed and no build/test/application operation was performed during this read.
