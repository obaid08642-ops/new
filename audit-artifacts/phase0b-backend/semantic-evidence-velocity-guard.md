# Phase 0B semantic evidence — VelocityGuard

**Archive member:** `src/common/guards/velocity.guard.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–28 from the baseline archive extraction.

Lines 1–6 define a Nest `CanActivate` guard backed by Redis. Lines 8–17 scope a `velocity:payment` counter to authenticated `request.user.id`, or fall back to request IP, then invoke `checkRateLimit` with five attempts per 600 seconds. Lines 19–26 return HTTP 429 when the limit is exceeded and otherwise allow the request.

**Auth/ownership:** authenticated user ID preferred; unauthenticated or missing-user requests are grouped by IP. No payment-intent/order scope is visible.

**State transitions:** Redis rate-limit counter/window managed by RedisService; no local state or reset path visible.

**Price/payment/insurance source:** payment-attempt boundary only; no amount/currency/payment provider logic visible.

**Security/truthfulness observations:** IP fallback can aggregate unrelated users or be bypassed through proxy/header configuration depending on framework trust; no route/method/body/payment-instrument scope is visible; Redis failure behavior is delegated and not handled here; fixed limits are embedded; unused `remaining` value is discarded, so retry metadata is not exposed.

**Test implications:** authenticated versus IP scope, proxy behavior, exact fifth/sixth attempts, concurrent increments, Redis failure, route isolation, and 429 retry headers. No tests executed during this semantic read.

**Consumer traceability:** guard usage mapping will feed the dedicated route-to-consumer phase.
