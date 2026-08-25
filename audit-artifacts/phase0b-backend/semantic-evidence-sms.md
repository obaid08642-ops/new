# Phase 0B semantic evidence — SMS

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/sms/sms.service.ts:2–62`
- `src/modules/sms/sms.module.ts:2–9`

`SmsService` is global and reads a runtime `featureflags` collection for `sms_enabled`; a present flag overrides the environment, otherwise it falls back to `SMS_ENABLED === 'true'` (`sms.service.ts:23–32`). SMS is disabled by default and `sendOtp` logs a no-op and returns false, expecting callers to fall back to email/push (`6–16,34–37`). If enabled, it fails closed when no provider env key exists (`39–42`). Despite checking Unifonic/Taqnyat/Infobip presence, the implementation only sends via Taqnyat and otherwise returns false (`44–55`).

The Taqnyat request posts the raw OTP in the message body and uses a bearer API key from environment; it has no visible timeout, retry/backoff, request correlation, idempotency, phone normalization/allowlist, or delivery-status verification beyond HTTP 200/201 (`44–54`). Errors log stack context but do not expose a typed failure reason to callers (`57–60`). There is no visible OTP redaction in logs beyond not logging the OTP directly, nor abuse/rate policy in this service itself. The module registers and exports the global service (`sms.module.ts:4–8`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: runtime admin-controlled SMS activation without visible change audit, partial-provider configuration/false readiness, missing transport timeouts/retries, unnormalized phone/OTP handling, ambiguous caller fallback and no delivery lifecycle/observability contract.
