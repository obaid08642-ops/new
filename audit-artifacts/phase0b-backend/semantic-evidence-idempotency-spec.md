# Phase 0B semantic evidence — idempotency.interceptor.spec.ts

**Archive member:** `src/common/idempotency.interceptor.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–85 from the baseline archive extraction.

Lines 1–28 build a mock POST request with authenticated user, path, body, idempotency key, Redis client, and Reflector metadata. Lines 30–39 assert that a metadata-required mutation without a key throws BadRequestException before handler execution.

Lines 41–55 assert a successful payment response is stored under user/method/path/key scope after a Redis NX lock, with request hash and 120-second lock expiry. Lines 57–64 assert same-request cached replay returns the original response with `idempotent_replay=true` without executing the handler.

Lines 66–74 assert different body reuse throws BadRequestException and an unavailable lock throws ConflictException. Lines 76–85 assert authenticated user separation in idempotency key scope.

**Auth/ownership:** tests use authenticated user IDs and verify cross-user cache separation; they do not test unauthenticated fail-open behavior or resource ownership.

**State transitions:** no cache → lock → successful cache/release; cached response → replay; same-key different-body → bad request; lock unavailable → conflict.

**Price/payment/insurance source:** payment-shaped body/path only; no provider settlement/amount validation.

**Security/truthfulness observations:** the suite is mock-only and does not test Redis failures, handler errors/lock cleanup, non-mutation bypass, oversized/non-string keys, JSON serialization ordering, query scope, cache parse errors, response status/header preservation, or the unauthenticated bypass. It verifies only interceptor mechanics, not idempotency of actual domain side effects.

**Test implications:** add integration coverage at cart/checkout/booking/payment boundaries, Redis failure, handler failure/retry, unauthenticated requests, metadata omission, and response metadata preservation. No tests executed during this semantic read.

**Consumer traceability:** decorator/interceptor usage and contract routes will feed the dedicated route-to-consumer phase.
