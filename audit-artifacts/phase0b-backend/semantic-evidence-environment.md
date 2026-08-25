# Phase 0B semantic evidence — environment contract

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `ENVIRONMENT.md:1–171`

The document claims that it covers every backend/frontend environment variable and that filling values is the only step remaining for production (`1–5`). That completeness/production assertion is not verifiable from this document and conflicts with the source findings register: it does not define variable schema, type/format validation, requiredness enforcement, rotation, ownership, secret manager mapping, environment separation, or evidence that every `process.env` access is represented.

Core configuration lists Mongo, DB, JWT, Redis, port, public URLs and CORS origins (`9–27`). Several security-sensitive values have permissive defaults or alternate forms: JWT expiry defaults to `7d`, port defaults to `3000`, Redis has URL and host/port/password alternatives, `USE_MEMORY_MONGO` is described as test-only, and `ALLOWED_ORIGINS` is a free-form comma-separated list (`13–27`). The document does not state fail-closed validation, minimum secret entropy, TLS requirements, URL allowlists, CORS normalization, production prohibition checks, or how conflicting aliases are resolved.

Authentication and notification sections enumerate SMTP, Resend, multiple SMS providers, FCM/Firebase duplicates, WhatsApp, APNs and Web Push (`29–49,124–155`). This creates provider fallback/duplicate-credential and delivery-truth risk without an authoritative provider selection, health contract, rotation/expiry policy, webhook authentication/replay policy, PII redaction or delivery audit model. Private-key material is explicitly represented as environment content for FCM/APNs/VAPID/SMTP (`46–49,129–140,147–150`), but no secret-manager or multiline encoding policy is provided.

Payments list multiple gateways and secrets (`50–58`) without mode/environment separation, currency/merchant configuration, webhook signature/version/replay policy, idempotency ownership, settlement/reconciliation, PCI boundary or fail-closed provider selection. LiveKit/TURN, AI, storage and feature flags are similarly listed (`60–97`), but the document does not define tenant/provider isolation, data residency, retention, model safety/grounding, object ACLs, signed URL TTLs, or feature-flag authorization and audit. The feature-flags heading says they are enabled by default (`81`), which is unsafe for regulated, paid or incomplete capabilities.

Expo variables expose API URLs, socket/LiveKit endpoints, Google Maps and Firebase client keys plus provider identifiers (`101–120`). Public build-time variables are not secrets by themselves, but the document does not distinguish safe public identifiers from accidental secret leakage or define mobile environment attestation, certificate pinning, endpoint integrity, timeout/retry policy, or release-channel separation. Backend URL aliases and frontend aliases are not normalized to one canonical contract.

The document mentions admin `REACT_APP_*`/`NEXT_PUBLIC_*`, APNs, Web Push, Resend/SES, SMS, AI provider switching and TURN overrides (`120–170`) without a machine-readable schema, generated example file, validation command, drift check or CI evidence. No product code was changed, no secrets were requested or accessed, no runtime was started and no tests were run during this semantic read.
