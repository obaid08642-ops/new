# Phase 0B semantic evidence — PasskeyController

**Archive member:** `src/modules/auth/passkey.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–72 from the baseline archive extraction.

Lines 1–17 define the passkey controller, Throttle support, request/response access, AuthService/PasskeyService dependencies, and controller-level JwtAuthGuard. Lines 8–13 explicitly state that no public start-login challenge route exists; login challenge issuance is intended to occur only after password verification through AuthService.

Lines 19–28 expose authenticated enrollment options and verification. Enrollment verification requires a response body and delegates device name/registration verification to PasskeyService. Lines 30–40 expose devices list and credential removal, each re-checking designated-admin enrollment eligibility before service calls.

Lines 42–70 expose public `POST auth/passkey/login/verify` with a throttle limit of 10 per 60 seconds. The endpoint requires identifier and WebAuthn response, delegates assertion verification to AuthService, and sets `nabd_admin_device` and `nabd_admin_token` cookies when returned. Both cookies are HttpOnly, SameSite Strict, path `/`, secure in production, with 90-day device and 7-day admin-token max ages.

**Auth/ownership:** JWT guard for management routes; public login verification relies on AuthService designated-admin and WebAuthn checks; device list/removal explicitly re-checks enrollment eligibility.

**State transitions:** enrollment options → verify → credential; public passkey assertion → AuthService session and trusted-device cookies.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** public passkey verification is throttled; no public challenge-start bypass; cookies are HttpOnly/SameSite Strict; endpoint derives IP from raw `X-Forwarded-For` first value rather than the guard’s trusted `req.ip` policy; token cookie lifetime differs from AuthService JWT refresh lifetime and requires boundary verification; result is returned directly and may include token fields in response despite cookie issuance.

**Test implications:** management unauth 401, designated-admin gate, enrollment replay, public verify throttle, invalid assertion, cookie flags/lifetime, response token leakage, proxy IP attribution, and no challenge-before-password invariant. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
