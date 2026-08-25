# Phase 0B semantic evidence — ApprovalWorkflowService spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/approval-workflow/approval-workflow.service.spec.ts:1–193`

The Jest module test builds `ApprovalWorkflowService` through a Nest `TestingModule` but supplies `any`-typed mocked models for approval requests, medicines, providers, facilities, labs, radiology, home-care and catalog publication (`1–66`). It covers rejection of a request missing `change_data`, creation of a new request with version 1, rejection persistence, approval creating a medicine, approval creating a home-care service, and approval patching an existing medicine (`68–191`).

The approval assertions check governed projection fields (`public_eligibility: true`, `indexing_eligibility: false`, `medical_review_status: approved`), provenance, entity IDs and a publication refresh carrying an actor/idempotency key for medicine (`108–135,162–190`). Home-care publication checks similar projection fields and publication entity type (`137–160`). These are useful focused mock-level assertions for intended publication policy.

The test does not establish authenticated admin authorization, actor role/tenant/facility scope, request ownership, reviewer identity, DTO/schema validation, field allowlisting, or protection against arbitrary `change_data` (`69–86,90–191`). It does not cover provider/facility/lab/radiology creation paths despite those model stubs, duplicate concurrent decisions, persisted status/version compare-and-set, transactional atomicity across request/entity/publication, rollback, outbox delivery, publication failure, idempotency replay/response equivalence, rejection reason constraints, audit/notifications, PII/PHI projection, cache/index invalidation or live database/deployment behavior. No code was changed and no build/test/application operation was performed during this read.
