# Phase 0B semantic evidence — auth.guard.spec.ts

**Archive member:** `src/common/auth.guard.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–171 from the baseline archive extraction.

Lines 1–55 build mocks for JwtService, Reflector, Mongo connection/model, and request context. Lines 57–73 test public endpoints without a token and private endpoints without a token. Lines 75–84 test valid Bearer JWT authentication and request.user assignment.

Lines 86–106 test role and fine-grained permission rejection. Lines 108–121 test fail-closed behavior for legacy header impersonation and assert no model lookup. Lines 123–131 test pending provider rejection for provider jobs while allowing onboarding progress. Lines 133–138 test approved provider passage through the central KYC gate.

Lines 142–171 test effective provider-role normalization for laboratory/lab, radiology, nursing, hospital, pharmacy, and canonical deduplication.

**Auth/ownership:** tests cover token presence, public metadata, role/permission gates, impersonation rejection, and provider approval; no resource owner/stranger/unauth integration is exercised.

**State transitions:** pending provider → onboarding-only; approved provider → provider route allowed; role/provider_type aliases → effective roles.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** all assertions use mocks and do not prove middleware order, cookie extraction, database ownership queries, or production KYC records; provider role literal `provider` and provider_type normalization are tested, but negative alias/tenant cases are not; impersonation test covers only legacy header path; no malformed JWT, expired JWT, cookie, Redis, or audit correlation coverage appears.

**Test implications:** add integration tests for cookie auth, ownership 404, provider tenant scoping, KYC lookup failures, malformed/expired tokens, role alias denial, impersonation session lifecycle, and guard composition. No tests executed during this semantic read.

**Consumer traceability:** guard test expectations will feed the dedicated route-to-consumer phase.
