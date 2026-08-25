# Phase 0B semantic evidence — Sentry exception filter

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/common/sentry.filter.ts:1–33`

`SentryExceptionFilter` catches all exceptions, obtains the HTTP request, and if an authenticated request user exists, calls `Sentry.setUser` with user ID, email (or empty string) and username/name fallback (`5–18`). It derives an HTTP status from `HttpException` or treats unknown exceptions as 500, captures only status 500+ exceptions, then delegates response handling to Nest's `BaseExceptionFilter` (`21–32`).

The filter sends direct identifiers (including email and name) to Sentry without visible consent, minimization, hashing, tenant/facility scope, retention, DSAR/deletion, environment gating or redaction policy (`11–18`). It does not sanitize exception messages, stack traces, request URL/query/body/headers, nested user fields or Sentry breadcrumbs/tags; the downstream SDK may therefore receive secrets, tokens, PII or medical data depending on global configuration (`21–29`).

`Sentry.setUser` is global SDK state and is not cleared after the request, so asynchronous/concurrent handling may risk stale user association unless managed elsewhere (`12–18`). Suppressing all 4xx capture may remove security/abuse/authorization telemetry without a separate privacy-safe audit path (`26–29`). The filter assumes an HTTP context and has no visible WebSocket/RPC/background-job handling, capture failure isolation, sampling/rate limit or request correlation (`7–10,26–31`). No code was changed and no build/test/application operation was performed during this read.
