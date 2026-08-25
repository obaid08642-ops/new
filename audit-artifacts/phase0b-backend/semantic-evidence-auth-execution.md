# Phase 0B semantic evidence — Auth execution surface

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/auth/auth.controller.ts:2–307`
- `src/modules/auth/auth.service.ts:2–1028`
- `src/modules/auth/passkey.service.ts:2–224`
- `src/modules/auth/passkey.controller.ts:2–72`
- `src/modules/auth/device-trust.service.ts:2–116`
- `src/modules/auth/auth.module.ts:2–48`

## Semantic read

`auth.controller.ts:34–123` defines patient OTP request/verify and 60-second exchange-token cookie bridge, opaque request behavior, password reset, plus legacy registration/login DTOs. Cookies are httpOnly/sameSite strict, but several legacy routes return token-bearing objects through JSON. `:125–203` handles registration, email/phone login, guest creation and admin 2FA; `:205–307` handles trusted devices, heartbeat/online sessions, body-based public refresh, logout/consent/legacy OTP/reset/social login. Multiple legacy/administrative bodies are typed only inline or `any`, and mutation idempotency is inconsistent.

`auth.service.ts:46–123` signs one-hour access and 14-day refresh JWTs, stores refresh sessions in Redis best-effort, rotates/deletes presented jtis and revokes the user family on reuse/device mismatch. Redis session-store failure does not break login, so token issuance can proceed without server-side replay tracking. `:125–131` appends consent to `legal_consents` inside User; no dedicated immutable compliance record or duplicate/version policy is shown. `:186–300` implements opaque patient OTP, bcrypt-hashed codes, rate limits, 5-minute OTP/lock TTL, 60-second single-use exchange token and httpOnly session conversion. Exchange claim uses NX but if the user is invalid after claim the claim cleanup is incomplete.

`:303–347` uses 60-second password reset tokens, single-use claim and session revocation, but only checks new password length eight. `:349–447` creates patient contract accounts with consents and separately creates PatientProfile; duplicate checks and two-document creation are non-atomic. Legacy registration permits a broad self-registerable provider-role list and immediately returns a session token. `:449–545` authenticates admin/password, trusted-device fast path and optional passkey flow, then OTP; successful admin 2FA issues trusted device. `:547–617` completes passkey login, sends new-device HTML email containing device/UA/IP without visible escaping, and exposes trusted device list/revoke wrappers.

`:629–750` creates/reuses device-bound guests using client-provided deviceId/phone and 90-day Redis mapping, then converts/merges guests by best-effort multi-collection updateMany across orders/carts/appointments/push/notifications/search/views/storage and profile reassignment. Failures per collection are swallowed; merge and guest deletion are not transactional or idempotent. `:752–910` returns publicUser including phone/email, handles legacy OTP and reset, with reset not visibly revoking all sessions. `:912–1028` social-login verifies Google through userinfo but Apple/X/Snapchat parse JWT-like tokens locally without signature/key verification; X/Snapchat synthesize fallback emails on malformed tokens, then create/login patient accounts.

`passkey.service.ts:54–150` gates enrollment to designated admin fresh DB email/role, stores challenges in Redis for 5 minutes and public credentials/counter; `:155–205` verifies authentication against credential owner and single-use Redis challenge, then writes new counter non-atomically. Diagnostic `console.error` logs RP/origin/credential owner metadata. `passkey.controller.ts:19–70` provides authenticated enrollment/device routes and public login verification with only presence checks, issuing 90-day device and 7-day admin cookies. `device-trust.service.ts:45–80` issues hashed 32-byte tokens and validates revoked=false, but no absolute expiry; revoke always returns `{ok:true}` even if device not found. `:82–115` records UA/IP/unknown-device heartbeat in a Redis JSON registry and returns online sessions based on five-minute TTL.

`auth.module.ts:20–48` is global, fails closed without JWT_SECRET and requires 32 characters in production, imports PushModule, registers canonical User/PatientProfile/ProviderProfile/PasskeyCredential/TrustedDevice models and auth controllers/services/repositories.

## Findings candidates

The read supports: best-effort refresh tracking, consent evidence weakness, non-atomic registration/guest merge, legacy token-in-body surfaces, unbounded/weak DTOs, missing idempotency on auth mutations, raw device trust lifecycle, passkey counter/diagnostic gaps, guest device-ID trust, and unverified Apple/X/Snapchat token parsing/fallback identities.

No product code was changed and no tests/builds were executed during this semantic read.
