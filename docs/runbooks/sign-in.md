# Runbook: sign-in / OTP failing

**Signals:** the `login` synthetic journey fails, support reports "no code arrives" or "wrong code", `class="auth"` 5xx or p95 up.

1. Is it the API? `class="auth"` errors and p95 (`nabd_http_class_errors_total`, `nabd_http_class_p95_ms`). If the API is down: `api-availability.md`.
2. Is it the code delivery? OTP is sent by the SMS provider through the notifications queue: `notifications-queue.md` (waiting/failed jobs). Provider status page first.
3. Is it protection? OTP limits and the auth rate limit return 429 on purpose; a spike of 429 from one network = abuse or a shared NAT, not an outage. Do not raise limits during an incident without the lead's approval.
4. Is it the account? The synthetic patient may be disabled or asking for 2FA (`docs/ops/synthetic-journeys.md`).
5. Is it Redis (sessions, OTP state)? Redis down shows as readiness failing; follow `api-availability.md`.
6. Tokens: refresh problems after a release = the app version gate (`docs/platform/R12-mobile-compat.md`); check `nabd_client_requests_total{app,version}` for a blocked version (426 responses = `app_update_required`).

**Mitigate:** switch the SMS provider only through the existing provider setting; never bypass OTP. **Verify:** `login` journey green twice, auth p95 under target.
