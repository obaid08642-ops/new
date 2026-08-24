# Phase 0B semantic evidence — AuthService

**Archive member:** `src/modules/auth/auth.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–350, 316–700, and 618–1028 from the baseline archive extraction; overlapping ranges were intentionally re-read to avoid truncation gaps.

Lines 21–44 define AuthService dependencies and TTL/attempt constants: legacy OTP TTL 5 minutes, patient OTP TTL 5 minutes, patient exchange TTL 60 seconds, patient OTP lock TTL 15 minutes, and maximum verify attempts 5. Lines 46–71 issue one-hour access tokens and 14-day refresh tokens with Redis-backed JTI/device session records; Redis session-store failure is swallowed and does not block login.

Lines 73–116 implement refresh-token verification, type checking, Redis JTI existence, replay/rotation revocation, device binding, user active check, and new token issuance. Missing Redis client means the JTI replay checks are skipped because the guarded block is conditional. Lines 108–123 implement all-device session revocation and event emission. Lines 125–131 append legal consent records.

Lines 133–183 normalize and key OTP/exchange/reset identifiers and define the opaque patient-web OTP response. Lines 186–226 implement patient OTP request: string validation, Redis rate limit of 3 per 10 minutes, account-enumeration-resistant response for unknown/inactive identifiers, bcrypt OTP hash storage in Redis with 5-minute TTL, and delivery through email/SMS/push with raw OTP not returned or logged by this path.

Lines 228–275 implement patient OTP verification. Six-digit format is required; lock and rate limits are applied; OTP hash and user ID are retrieved from Redis; invalid attempts update the remaining TTL; success consumes the OTP and creates a random exchange token stored for 60 seconds with optional device binding. Lines 277–301 implement one-time exchange: Redis SET NX claim is used before reading, token is deleted after retrieval, active user is checked, and access/refresh tokens are returned by the service.

Lines 303–347 implement opaque password-reset request and one-time reset-token claim. Reset TTL is 60 seconds; password minimum length is 8; user sessions are revoked after password replacement. Lines 349–405 implement contract registration: required name/identifier/password/locale/consent validation, duplicate consent detection, identifier conflict, patient account/profile creation, registration event, OTP request, and minimal `{registered:true}` response without a session token.

Lines 407–447 implement legacy registration. Email/phone uniqueness is checked, password is bcrypt-hashed, self-registerable roles are allowlisted to patient and provider/service roles, patient profile is created for patients, and the response includes public user plus access/refresh token bundle. Lines 449–515 implement password login. Credentials and active status are checked; admin/super-admin paths support trusted-device fast path, optional passkey enforcement, or OTP 2FA; ordinary roles receive a public user and token bundle.

Lines 517–545 implement legacy 2FA verification against the actual OTP contact, then issue session tokens. Admins receive a trusted-device token and new-device alert when enabled. Lines 547–580 implement passkey login completion after designated-admin checks and WebAuthn assertion verification, then issue tokens/trusted device.

Lines 582–606 implement security email alert using interpolated device/user-agent/IP/time data. Lines 608–627 expose trusted-device list/revoke/heartbeat/online-device service methods, with empty/false responses when the optional device service is unavailable.

Lines 629–667 implement device-bound guest identity. A Redis device key reuses guest identity for the same device; otherwise a random guest phone can be created, patient profile is initialized, and the mapping persists for 90 days. Lines 669–750 implement guest conversion and email merge: guest-linked collections are bulk repointed best-effort, patient profile may be updated, guest can be deleted after merge, or converted in place with a bcrypt password and `is_guest=false`.

Lines 752–767 implement `me` and public-user projection. Lines 770–842 implement legacy OTP send: configurable issue limits/window, user existence check, bcrypt hash in Redis, push plus email/SMS delivery, and a non-production warning when no delivery channel exists. Lines 844–884 implement legacy OTP verify with configurable rate limits, attempt tracking, code consumption, and user activation.

Lines 886–910 implement legacy password reset requiring OTP verification against the contact that received it. Lines 912–961 implement social login. Google uses a live userinfo request; Apple, X, and Snapchat helpers differ: Apple decodes JWT payload without visible signature/JWKS verification; X and Snapchat decode three-part tokens but otherwise synthesize fallback emails based on current time and return successful-looking identities. Social login then creates or reuses a patient and issues tokens.

Lines 963–1027 implement social token helpers. Google catches failures and returns null. Apple parses the JWT payload directly. X and Snapchat return synthetic identities when token shape/decoding is not valid, rather than rejecting the token. These are explicit baseline truthfulness/security defects.

**Auth/ownership:** Redis OTP/exchange/reset keys are identifier/token scoped; user and patient account linkage is service-controlled; admin 2FA/passkey/trusted-device branches; guest device mapping; social account reuse by email.

**State transitions:** OTP requested → verified → one-time exchange → session; refresh token active → rotated/revoked; password reset requested → claimed → password/session replacement; guest → converted/merged/deleted; admin login password → OTP/passkey/trusted device → session.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** refresh replay checks are conditional on Redis availability; OTP/password reset exchange is one-time through Redis claims; legacy and contract auth paths coexist with differing TTL/response semantics; raw social-token decoding and synthetic X/Snapchat identity fallbacks can accept unverified credentials; guest merge is best-effort across collections; security alert failure is swallowed; legacy registration/social login return token fields while contract registration/OTP exchange intentionally separate session issuance.

**Test implications:** Redis unavailable fail-closed behavior, OTP enumeration/rate/lock/replay, exchange concurrency, refresh rotation/device mismatch, reset replay/session revocation, consent/identifier uniqueness, role allowlist, 2FA contact mapping, passkey/trusted-device gates, guest merge integrity, social provider signature validation, synthetic-token rejection, cookie/header boundary, and legacy-vs-contract parity. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
