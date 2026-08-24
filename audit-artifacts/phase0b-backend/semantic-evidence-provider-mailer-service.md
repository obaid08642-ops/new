# Phase 0B semantic evidence — provider-mailer.service.ts

**Archive member:** `src/modules/provider/services/provider-mailer.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–95; full 95-line member covered.

Lines 2–17 define mail abstractions and a message shape with recipient, subject, optional text/HTML and tag. Lines 19–23 define DisabledAdapter, which returns failed with `mail_delivery_unavailable` and does not log the body. Lines 25–40 define ResendAdapter: POST to Resend with bearer API key, from/to/subject/text/html/tags, parse JSON, return sent/failed and log provider error/status.

Lines 42–68 define Nodemailer SMTP adapter with host/port/credentials, TLS based solely on port 465, plain text and fallback HTML `<p>${msg.text}</p>`, and error logging. Lines 70–95 select Resend when `RESEND_API_KEY` exists, otherwise SMTP when credentials exist, otherwise DisabledAdapter; defaults include from `noreply@nabd.app` and SMTP host `smtp.gmail.com`; `send` delegates to the adapter.

**Security/secrets:** API key/password are passed to adapters and not included in successful logs, but transport security is simplified to `secure: port === 465`; no explicit TLS verification, timeout, certificate policy, sender-domain validation or secret rotation is visible. Default sender/domain may be non-production. Error logs include provider messages/status and exception text; downstream providers may include sensitive metadata.

**Truthfulness/reliability:** disabled mode fails closed rather than logging OTPs, which is safer, but there is no retry, backoff, outbox, delivery status persistence, idempotency or alerting. A transient Resend/SMTP failure is returned synchronously and callers decide whether the operation remains successful. No provider response verification beyond HTTP `ok`/SMTP completion is visible.

**Content safety:** SMTP fallback constructs HTML directly from unescaped text, so user-controlled message content can become HTML markup in recipients’ clients. No size, subject/header, recipient validation or template policy is visible in this abstraction.

**Operational:** no timeout or cancellation is configured for fetch/SMTP; calls can hang until library/network defaults. Provider selection happens at construction and cannot rotate credentials without process restart. Tags are sent to Resend but not SMTP.

**Price/payment/insurance source:** none visible.

**Test implications:** require disabled/fail-closed tests, Resend/SMTP transport mocks at integration boundary, timeout/retry/outbox/idempotency, secret/log redaction, TLS/hostname/sender validation, HTML escaping/header injection, recipient/size validation, provider response semantics and credential rotation tests. No tests executed during this semantic read.
