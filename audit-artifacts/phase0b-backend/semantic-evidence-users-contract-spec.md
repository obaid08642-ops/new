# Phase 0B semantic evidence — Users notification/session contract spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/users/users.contract.spec.ts:1–64`

The spec creates a UsersService prototype with mocked patientRepository and redisService (`6–14`). It verifies legacy flat notification settings normalize into bounded channels/categories and discard unknown values (`16–24`); allowlisted boolean channel/category updates merge with defaults and persist through an upsert scoped by user_id (`26–41`); unknown keys, a NoSQL path and non-boolean values throw BadRequestException (`43–48`). It verifies a foreign refresh-session JTI produces NotFoundException and does not call Redis delete/removal (`50–58`). It also verifies metadata marks notification PATCH and session DELETE as idempotency-required (`60–63`).

The allowlist and NoSQL-key tests are useful input hardening, and the foreign-session negative path preserves no-delete behavior. However, repository and Redis are mocked, so no HTTP auth/session-cookie execution, user ownership/tenant/facility boundary, session JTI binding/expiry/revocation race, Redis failure behavior, refresh-token rotation or replay resistance is proven (`6–14,50–58`). Settings tests do not cover user state, consent/legal basis, channel verification, device binding, CSRF, rate limits, audit actor/time, privacy/retention or notification delivery effects (`17–48`). The persistence uses upsert but no concurrent update/idempotency replay/optimistic version behavior is tested (`29–40`). No code was changed and no build/test/application operation was performed during this read.
