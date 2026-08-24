# Phase 0B semantic evidence — providers.service.spec.ts

**Archive member:** `src/modules/providers/providers.service.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–55; full 55-line member covered.

Lines 2–15 build `ProvidersService` with mocked repositories, branch model, events and publication service. Lines 17–37 test that `myProfile` queries using authenticated actor identifiers across `user_id`, `id` and `account_id`, projects out `_id`/`__v`, and returns the matched profile. Lines 39–47 test fail-closed behavior when no profile matches supplied account/profile IDs. Lines 49–54 test that absence of usable actor identifiers throws NotFoundException without querying the repository.

**What is proven:** unit-level actor-identifier matching and fail-closed no-identifier behavior for `myProfile`, including a restricted projection.

**What is not proven:** HTTP guards, role/tenant isolation, stranger access, duplicate identity ambiguity, provider publication/active status, branch visibility, PII minimization beyond two fields, repository query/index behavior, concurrent identity changes, error handling, or all provider list/detail surfaces. All collaborators are mocks.

**Truthfulness/operational:** fixture only contains IDs and does not prove that returned profile is approved, active, licensed or publicly publishable. The test does not verify the publication service or event behavior.

**Test implications:** add integration tests for owner/stranger/unauth/role/tenant, ambiguous identifiers, soft-deleted/unapproved profiles, public publication filters, PII projection, indexes/performance and concurrent identity updates. No tests executed during this semantic read.
