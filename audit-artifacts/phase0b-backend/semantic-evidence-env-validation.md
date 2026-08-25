# Phase 0B semantic evidence — environment validation

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/config/env.validation.ts:1–13`

`validateEnvironment` derives `NODE_ENV`, defaulting absent/falsey values to `development`, and immediately returns the supplied environment unchanged for every non-production value (`1–3`). In production it requires non-empty string values for `MONGO_URL`, `REDIS_URL`, `JWT_SECRET` and `ALLOWED_ORIGINS`, throwing a fatal error when any is missing (`5–7`). It also requires a JWT secret of at least 32 characters and rejects a literal wildcard entry in the comma-separated allowed-origin list (`8–10`).

This is a narrow production fail-closed guard and does not validate URI schemes/hosts/TLS, Mongo/Redis credential separation, JWT entropy/rotation, provider/payment/LiveKit/S3/LLM/webhook secrets, cookie/session settings, encryption keys, email/SMS/OTP configuration, feature flags, rate limits, CORS normalization or duplicate/empty origins. It does not reject credentials in non-production or unknown/mistyped environment keys (`2–12`).

The check for wildcard only matches an entry equal to `*`; it does not prove that origins are trusted, normalized, HTTPS in production, free from dangerous schemes/ports, or free from duplicate/confusable values (`9–10`). The function returns the original untyped record and performs no schema coercion, redaction, startup audit or secret lifecycle/rotation validation (`1,12`). No code was changed and no build/test/application operation was performed during this read.
