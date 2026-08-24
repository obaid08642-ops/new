# Backend route reconciliation — Auth / OTP / session

Baseline backend source: `main @ 22526bedb77a3d8148219036367e4714f401aecc`. Audit-only; no auth changes.

`nabdah-backend/src/modules/auth/auth.controller.ts:81–83` declares `@Controller('auth')` with a class-level `JwtAuthGuard`, while patient-web bridge routes explicitly use `@Public()` (`:86–105`). The verified bridge is `POST /auth/otp/request` with throttling and `PatientOtpRequestDto` (`:87–92`), `POST /auth/otp/verify` with throttling and `PatientOtpVerifyDto` (`:94–100`), and `POST /auth/session/exchange` with `PatientSessionExchangeDto` (`:102–109`). Exchange sets access/refresh cookies using cookie options and returns only `{ authenticated: true }` (`:105–109`), matching the httpOnly-only Web contract; the actual cookie attributes and DTO fields still require exact schema/runtime verification.

The controller also exposes legacy/public alternatives: `POST /auth/password/forgot`, `/password/reset`, `/register`, `/login`, `/guest`, `/login/verify-2fa`, `/refresh`, `/send-otp`, `/verify-otp`, `/reset-password`, and `/social-login` (`:112–166,169–203,241–247,276–305`). Login accepts identifier/email/phone and can set `DEVICE_COOKIE` and `nabd_admin_token` (`:145–166`); refresh accepts a `refresh_token` in the body (`:241–247`); social login accepts provider token/body (`:301–305`). These are separate contracts from the patient-web OTP bridge and create a parity/legacy-policy decision: Mobile must not silently reintroduce body/URL token handling if the web security invariant is cookie-only.

`POST /auth/guest` is public and takes phone plus optional `x-device-id` (`:169–174`), while `POST /auth/convert-guest` requires the class guard and CurrentUser (`:176–179`). `POST /auth/logout` is callable without a visible guard and clears only `nabd_admin_token` (`:265–274`), whereas patient session exchange uses separate patient cookies; logout-all and consent are guarded (`:249–263`). This creates a session-revocation reconciliation concern requiring runtime proof that every patient cookie is cleared/revoked and that guest/device sessions cannot persist unexpectedly.

## Reconciliation disposition

The new OTP bridge is structurally consistent with the requested Web contract, but legacy login/refresh/guest/social/OTP routes coexist with different token and cookie semantics. DTO validation, cookie names/options, rate-limit behavior, exchange single-use/TTL, session revocation, provider/social token handling and owner/unauth tests remain required. No Phase 0 remediation was made.
