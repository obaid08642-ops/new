# Phase 0B semantic evidence — pharmacy.controllers.spec.ts

**Archive member:** `src/modules/pharmacy/pharmacy.controllers.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–40; full 40-line member covered.

Lines 2–9 import AdminPharmacyController and construct it with a mocked seed service plus empty dependencies. Lines 10–19 preserve and restore NODE_ENV and ALLOW_TEST_SEED and clear mocks after each test.

Lines 21–29 set NODE_ENV=production and ALLOW_TEST_SEED=true, then assert that seed and sampleOrder throw ServiceUnavailableException and do not call seed helpers. This verifies that production denies test seed operations even when the allow switch is set.

Lines 31–39 set NODE_ENV=test and ALLOW_TEST_SEED=true, configure mock returns, and assert isolated seed/sampleOrder helpers are allowed. The sampleOrder actor has patient-1 with role admin, so the test does not exercise role/actor consistency or authorization beyond the controller's seed switch.

**What is covered:** only the AdminPharmacyController test-seed guard and its two environment switches. This is a useful truthfulness safeguard against production seed records, but it is mock/direct-controller driven.

**Coverage gaps:** no real module bootstrap, guard execution, role matrix, pharmacy ownership, admin tenant scope, catalog, inventory, quotation, shortage, procurement, chat or order routes are tested. No unauth/stranger cases, DTO validation, state transition, idempotency, transaction, audit, PII projection, or seed data cleanup tests exist here. Environment values are mutated directly and no test covers unset/malformed values or NODE_ENV variants.

**Security/truthfulness:** The test proves the controller method's switch behavior only; it does not prove production cannot reach alternate seed paths, service-level seed methods, direct database fixtures or other controllers. The test's actor mismatch (patient id with admin role) should be covered explicitly because it may conceal principal/role validation gaps.

**Test implications:** add integration route tests for every Pharmacy controller; verify JwtAuthGuard/Roles, tenant and resource ownership, raw input validation, idempotency and transactional state changes; add production seed-path scanning and database assertions; cover environment switch fail-closed behavior for all variants. No tests executed during this semantic read.
