# Phase 0B semantic evidence — PasskeyService

**Archive member:** `src/modules/auth/passkey.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–224 from the baseline archive extraction.

Lines 1–38 define PasskeyService with SimpleWebAuthn, passkey/user models, Redis, and enrollment/login challenge TTLs of five minutes. Lines 40–52 derive RP ID, RP name, allowed origins, and designated admin email from environment with defaults.

Lines 54–65 implement enrollment authorization using a fresh database user lookup by JWT user ID. Email must match the designated admin email and role must be admin/super_admin. Lines 68–88 count/list credentials and prevent removal of the last passkey; list output is reduced to credential/device timestamps.

Lines 90–115 implement enrollment challenge generation with required user verification, preferred resident key, supported algorithms, existing credential exclusion, and Redis challenge storage. Lines 117–150 consume the enrollment challenge, verify origin/RP ID/user verification, reject invalid/duplicate credentials, and persist credential public key/counter/transports/device name.

Lines 153–171 implement login challenge generation only for an existing user’s credentials, with required user verification and Redis challenge storage. Lines 174–206 consume the login challenge, locate the credential, verify assertion against stored public key/counter/origin/RP ID, update counter and last-used time, and return owning user ID.

Lines 208–223 implement Redis challenge storage and read-delete single-use semantics. Missing Redis client fails enrollment challenge creation with `challenge_store_unavailable`; login challenge retrieval returns null and therefore fails as expired/invalid.

**Auth/ownership:** designated-admin email and fresh DB role check for enrollment; credential ownership is inferred from credential record; login returns credential owner ID for AuthService verification.

**State transitions:** enrollment start → challenge → verified credential; login challenge → assertion → counter update/session issuance by AuthService; credential remove except last.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** single-use Redis challenge consumption; required user verification; RP/origin environment defaults; diagnostic logs include RP/origin and credential user on verification failure; challenge storage failure is fail-closed for enrollment but login maps unavailable storage to challenge failure; no visible rate limit inside service (controller may supply it).

**Test implications:** designated admin and fresh-user-role checks, challenge TTL/replay/concurrency, RP/origin configuration, WebAuthn signature/counter verification, duplicate credential, last-passkey protection, Redis unavailable behavior, diagnostic log redaction, and controller rate limiting. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
