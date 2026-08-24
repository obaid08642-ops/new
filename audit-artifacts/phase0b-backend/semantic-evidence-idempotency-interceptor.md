# Phase 0B semantic evidence — IdempotencyInterceptor

**Archive member:** `src/common/idempotency.interceptor.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–74 from the baseline archive extraction.

Lines 1–13 define the Nest interceptor, `REQUIRE_IDEMPOTENCY` metadata, `RequireIdempotency` decorator, Redis dependency, and Reflector. Lines 15–24 inspect method and header, treat POST/PATCH/DELETE as mutations, require the key only when route metadata is set, and bypass non-mutations.

Lines 26–32 validate string key type and maximum length 128. If no authenticated user ID exists, the interceptor fails open and calls the handler without idempotency processing. Lines 34–39 scope cache to user ID, HTTP method, original URL/path, and supplied key; request body is SHA-256 hashed; Redis cache is queried.

Lines 41–50 return cached responses as idempotent replays and reject same-key/different-body reuse. Lines 52–58 acquire a Redis NX lock with 120-second expiry and reject concurrent same-scope requests with Conflict. Lines 60–65 cache successful responses for 24 hours, release the lock, and return the response. Lines 66–71 do not cache errors and attempt to release the in-flight key before rethrowing.

**Auth/ownership:** cache scope is user/method/path/key; unauthenticated requests bypass the mechanism. The interceptor does not itself establish authentication or ownership.

**State transitions:** no domain state; Redis lock → response cache on success, lock release on success/error.

**Price/payment/insurance source:** none visible; comment says intended use is authenticated payment mutations.

**Security/truthfulness observations:** idempotency is opt-in through handler metadata, not globally enforced; unauthenticated mutation paths fail open; `JSON.stringify` body hash is serialization-order sensitive; original URL query variations are part of scope; cached response is returned without visible status/header preservation; Redis get/parse/set failures are not explicitly handled; 24-hour cache and 120-second lock are embedded defaults; successful handler side effects may occur before cache persistence failure is surfaced.

**Test implications:** required-vs-optional metadata, unauth bypass, invalid/oversized keys, same-key replay, different-body conflict, concurrent lock, Redis failure, error retry, response shape/status preservation, query/path scope, and JSON key-order behavior. No tests executed during this semantic read.

**Consumer traceability:** decorator/interceptor usage mapping will feed the dedicated route-to-consumer phase.
