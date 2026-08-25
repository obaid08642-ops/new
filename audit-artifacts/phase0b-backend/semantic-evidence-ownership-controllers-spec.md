# Phase 0B semantic evidence — patient-owned controller contracts

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/contracts/ownership-controllers.spec.ts:1–36`

The spec uses a minimal authenticated request containing only `user.id` and a missing-user request (`6–8`). For MaternityController it mocks getProfile, asserts missing user throws UnauthorizedException, and verifies the authenticated ID is forwarded (`10–17`). For NutritionController it mocks getDailySummary/logWater, asserts missing user is unauthorized and verifies authenticated owner ID plus amount 250 is forwarded to logWater (`19–26`). For FamilyController it mocks getMyGroup/setMemberPermissions, asserts missing user is unauthorized and verifies caller ID, member ID and permissions are forwarded (`28–35`).

This is a controller delegation test, not a full ownership/security matrix. It does not test stranger resource access/404, roles beyond an arbitrary patient-like ID, verified/active/deleted/suspended status despite test descriptions, family-member consent/delegation boundaries, tenant/facility separation, path/body ID mismatch, DTO validation or HTTP guards/pipes/error serialization. Services are mocked, so database ownership predicates, mutation authorization, transactions, idempotency, PII projection, audit and cross-module behavior are unproven (`11–34`). It does not cover all controller methods, pagination, rate limits, CSRF/session behavior, or live request handling. No code was changed and no build/test/application operation was performed during this read.
