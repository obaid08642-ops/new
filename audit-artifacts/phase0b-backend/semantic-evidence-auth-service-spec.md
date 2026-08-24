# Phase 0B semantic evidence — auth.service.spec.ts

**Archive member:** `src/modules/auth/auth.service.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–180 and 181–243 from the baseline archive extraction; the second range closed the truncation boundary.

Lines 2–58 construct a Nest testing module with mocked user/patient models, JWT, EventEmitter, and Redis. Lines 60–175 test guest conversion failure for missing/non-guest users, successful guest-to-permanent conversion with bcrypt password hash and tokens, existing-user merge conflict, and password mismatch conflict.

Lines 177–214 test administrative 2FA verification for email and phone contacts, including OTP contact selection and returned user/token values. Lines 216–242 test OTP storage hardening: normalized login key, bcrypt hash only, five-minute TTL, rejection of plaintext code, hashed OTP verification, and deletion of OTP and verification-rate keys.

**Auth/ownership:** service-level tests cover guest conversion and admin 2FA but do not prove caller ownership of guest IDs or HTTP cookie exchange. Guest conversion takes an explicit guest ID and tests do not show actor binding.

**State transitions:** guest → permanent; guest conflict → ConflictException; email/phone login → 2FA verify → tokens; OTP stored → verified → OTP/rate key deleted.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** tests use mocks and return tokens from service methods; they do not prove HTTP response suppression/cookie flags; guest merge relies on model/db mocks and does not prove atomic history migration; test contains blank lines and a suspicious expectation naming mismatch (`password mismatch` test expects ConflictException); no rate-limit denial, brute-force attempts, Redis failure, social/Apple verification, refresh rotation, device trust, or ownership tests appear.

**Test implications:** integration tests for guest actor binding/history migration, HTTP cookies/no-body tokens, 2FA rate limits, OTP failure/attempt exhaustion, Redis failures, refresh rotation, social signature verification, device trust, and owner/stranger/unauth. No tests executed during this semantic read.

**Consumer traceability:** AuthService test expectations will feed the dedicated route-to-consumer phase.
