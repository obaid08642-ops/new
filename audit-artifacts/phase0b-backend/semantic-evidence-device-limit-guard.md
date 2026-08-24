# Phase 0B semantic evidence — DeviceLimitGuard

**Archive member:** `src/common/guards/device-limit.guard.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–42 from the baseline archive extraction.

Lines 1–6 define a Nest `CanActivate` guard backed by Redis. Lines 8–19 read `x-device-id`; registration without the header is rejected with HTTP 400. Lines 21–31 use a Redis set keyed by the device fingerprint and add the request body phone when present. Lines 30–40 count set members, reject counts over three with HTTP 403, and otherwise allow the request.

**Auth/ownership:** no authenticated actor binding is visible; membership is keyed by caller-supplied device ID and request-body phone.

**State transitions:** Redis device fingerprint set grows with observed phone values; no TTL, removal, or device re-verification is visible.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** caller-controlled `x-device-id` and phone values are trusted; no format/cryptographic binding, rate limit, expiry, or Redis error handling is visible; a user can rotate device IDs and a shared device can exhaust the three-account limit; the guard writes state before the final count and has no rollback for downstream failure. Error message exposes anti-fraud policy.

**Test implications:** missing header, malformed/rotated device IDs, spoofed phone, concurrent registrations, Redis failure, set growth/TTL, exactly-three versus four accounts, and guard ordering. No tests executed during this semantic read.

**Consumer traceability:** guard usage mapping will feed the dedicated route-to-consumer phase.
