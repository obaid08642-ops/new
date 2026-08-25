# Phase 0B semantic evidence — Mail

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/mail/mail.module.ts:2–115`

`MailService` initializes Resend when `RESEND_API_KEY` exists, otherwise attempts SES SMTP fallback (`mail.module.ts:24–70`). `send` always tries Resend first, then SES on any failure, and never throws; it emits mail.sent/mail.failed events and returns provider/fallback booleans (`72–92`). No visible timeout, retry/backoff, circuit breaker, delivery status reconciliation, deduplication or idempotency exists. A new Nodemailer transporter is created for every SES send (`55–70`).

`fromAddress` is configurable by `MAIL_FROM` with a default Nabd address (`35–37`); SES can use another `SES_FROM` (`63–65`). The service logs recipient addresses and subject in warnings/errors (`79–90`) and emits recipient/subject in events (`77,86,90`). `sendOtp` interpolates a raw code into HTML and plaintext and claims a ten-minute expiry (`95–106`) with no visible escaping, code-format validation, locale/template selection, or delivery binding.

The module is global and exports MailService (`110–115`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: raw HTML/OTP interpolation, recipient PII in logs/events, uncontrolled sender configuration, fallback duplicate-delivery risk, no transport bounds/reconciliation, per-send SMTP connection overhead and no consent/unsubscribe/retention policy.
