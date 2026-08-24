# Phase 0B semantic evidence — provider-request-engine.service.assignment.spec.ts

**Archive member:** `src/modules/provider/services/provider-request-engine.service.assignment.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–32; full 32-line member covered.

Lines 2–13 build `ProviderRequestEngineService` with mocked repositories/services and expose operators/audit mocks. Lines 16–23 test successful staff assignment for a hospital actor: the request carries `provider_account_id`, the operator lookup must include staff ID, facility ID and `status: active`, the request receives `assigned_staff_id`, and audit is expected to include assignment metadata.

Lines 25–31 test fail-closed behavior when the supplied staff identity is not an active roster member: the service rejects with `ForbiddenException` and does not save the request.

**What is proven:** at unit level, the service checks active operator roster membership against the request facility before assigning staff and records an audit call on success. The negative test checks no save after a null operator lookup.

**What is not proven:** mocks bypass HTTP guards, authenticated actor permissions, facility tenant isolation, operator-management permission, request ownership/visibility, DTO validation, malformed IDs, disabled/revoked operator races, concurrent assignment, CAS/transactions, replay/idempotency, audit failure, event/notification consistency, status-transition policy and session/device context. The test also does not assert the actor is authorized to assign staff beyond the actor object passed to the service.

**Truthfulness/financial source:** none visible.

**Test implications:** add owner/stranger/unauth/role matrix integration tests, active-to-disabled race tests, concurrent assignment/CAS, replay and idempotency, audit/event failure behavior, and request-status/tenant isolation tests. No tests executed during this semantic read.
