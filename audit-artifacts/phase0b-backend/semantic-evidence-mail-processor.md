# Phase 0B semantic evidence — Transactional mail processor

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/notifications/processors/mail.processor.ts:1–19`

`MailProcessor` consumes Bull jobs from `email-queue` under the `send-otp-transactional` process name. The declared payload is `{ destinationEmail: string; secureCode: string }`; it passes both values directly to `MailService.sendOtp` (`mail.processor.ts:5–13`). On a non-OK result it throws an error containing `result.error`, intentionally causing job failure/DLQ routing (`13–17`). The processor does not validate email/code shape, job origin/version, expiry, attempt count or replay identity; it does not redact destination/code from job logs/errors, does not define idempotent delivery semantics, does not distinguish transient/permanent provider failures, and does not add audit/trace metadata or an explicit bounded retry/backoff contract. The DLQ comment says payload is pushed directly, but the code's actual behavior is only throwing an error; DLQ configuration is external and not established here (`15–16`). No product code was changed and no tests/builds were executed during this semantic read.
