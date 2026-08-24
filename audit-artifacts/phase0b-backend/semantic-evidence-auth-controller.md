# Phase 0B semantic evidence — Backend AuthController

**Archive member:** `src/modules/auth/auth.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read source:** `/tmp/nabd-main-audit/phase0b-backend-source/src/modules/auth/auth.controller.ts` (extracted from baseline archive bytes; SHA-256 is recorded in the Phase 0B manifest).

## Semantic read

Lines 1–28 define cookie names/options and derive client IP from `x-forwarded-for`; the first forwarded value is trusted without an explicit proxy-trust policy. Lines 29–79 import the service/guards and define DTO classes. Registration accepts both a legacy payload and the patient-contract payload; `password` has only a minimum length, while `consents` is optional and its nested values are not decorated for runtime validation in this file.

Lines 81–110 establish the controller-level JWT guard with `@Public()` exceptions for OTP request/verify and session exchange. OTP request accepts one string identifier and is throttled at 3/10 minutes. OTP verify accepts identifier/code/device_id and is throttled at 5/15 minutes. Session exchange accepts an opaque exchange token, calls the service, sets `nabd_patient_access` and `nabd_patient_refresh` as HttpOnly/SameSite Strict cookies, and returns only `{ authenticated: true }`; tokens are not returned in the JSON response.

Lines 112–123 define public forgot/reset patient password endpoints. Lines 125–141 expose public registration with legacy-versus-contract branching. The branch checks whether optional contract fields are present, then casts possibly absent `name`, `identifier`, `locale` and `consents` to required values before calling the service. This is a contract/runtime validation concern.

Lines 143–167 expose public login accepting an untyped body and identifier/email/phone fallback. The result may set `nabd_admin_token` and return the service result directly. This is a token-surface divergence from the patient cookie-only exchange contract and requires consumer/DTO/service confirmation. Lines 169–179 expose guest creation and guarded guest conversion; the guest device header/body semantics are split.

Lines 181–202 expose public 2FA verification with an untyped body and may set the admin token cookie. Lines 205–239 expose guarded `me`, trusted-device listing/revocation, heartbeat, and online-session reads, all using `CurrentUser` IDs. Lines 241–247 expose public refresh with a raw body refresh token, which is a body-token contract distinct from the patient HttpOnly exchange.

Lines 249–263 expose guarded logout-all and consent recording. Consent accepts a raw `{document_type, version}` body and writes user profile metadata according to the comment; there is no idempotency decorator visible in this controller. Lines 265–273 expose logout that clears only `nabd_admin_token`, not the patient access/refresh cookies. Lines 276–305 expose legacy send/verify OTP, reset-password, and social-login routes with raw/untyped bodies and independent throttles.

## Contract/state/consumer implications

**Routes/events:** `POST /auth/otp/request`, `/auth/otp/verify`, `/auth/session/exchange`, `/auth/password/forgot`, `/auth/password/reset`, `/auth/register`, `/auth/login`, `/auth/guest`, `/auth/convert-guest`, `/auth/login/verify-2fa`, `GET /auth/me`, `GET/DELETE /auth/trusted-devices`, `POST /auth/heartbeat`, `GET /auth/sessions/online`, `POST /auth/refresh`, `POST /auth/logout-all`, `POST /auth/consent`, `POST /auth/logout`, `/auth/send-otp`, `/auth/verify-otp`, `/auth/reset-password`, `/auth/social-login`.

**Auth/ownership:** Controller guard is JWT by default, with public exceptions. Guarded routes use `CurrentUser` for user-scoped operations. The login/2FA/admin-cookie behavior and public refresh/body token behavior require separation of patient/admin contracts and revocation proof.

**State transitions:** OTP request → OTP verification → one-time exchange token → HttpOnly patient session exchange; legacy login/2FA → service result/admin cookie; password reset and guest conversion are separate transitions. Logout clears only admin cookie in this controller.

**Price/payment/insurance:** none in this member.

**Tests/acceptance implications:** require unauth/owner/stranger or wrong-role tests for guarded user resources, OTP replay/expiry/rate-limit tests, cookie-only assertions for patient exchange, admin/patient token-surface tests, logout cookie revocation tests, DTO/runtime validation tests, forwarded-IP trust tests, and duplicate consent/logout/revocation behavior. No test was executed as part of this semantic read.

**Finding classification:** source-confirmed contract drift/ambiguity; this evidence does not remediate it and does not assert journey completion.
