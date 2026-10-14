# Rate limits

S-6 acceptance source: this table is read by `backend/acceptance/s-6/rate-limits.acceptance.ts`.
Do not change a number here without changing the matching `@Throttle` decorator.

Limits are enforced per client IP and shared across API instances through the
Redis-backed throttle store. A route answers 429 with a whole-second
`Retry-After` header once its limit is exceeded.

| Route | Limit | Window seconds |
|---|---|---|
| `POST /api/v1/auth/login` | 10 | 60 |
| `POST /api/v1/auth/register` | 10 | 60 |
| `POST /api/v1/auth/otp/request` | 3 | 600 |
| `POST /api/v1/auth/otp/verify` | 5 | 900 |
| `POST /api/v1/auth/send-otp` | 5 | 60 |
| `POST /api/v1/auth/verify-otp` | 10 | 60 |
| `POST /api/v1/auth/password/forgot` | 3 | 600 |
| `POST /api/v1/auth/password/reset` | 5 | 60 |
| `POST /api/v1/auth/reset-password` | 5 | 60 |
| `POST /api/v1/auth/login/verify-2fa` | 10 | 60 |
| `POST /api/v1/auth/social-login` | 10 | 60 |
| `POST /api/v1/ai/assistant` | 10 | 60 |
| `POST /api/v1/ai/triage` | 10 | 60 |
| `POST /api/v1/ai/voice-to-order` | 10 | 60 |
| `POST /api/v1/ai/prescription-ocr` | 15 | 60 |
| `POST /api/v1/ai/copilot/suggest` | 15 | 60 |
| `POST /api/v1/ai/ocr-translate` | 15 | 60 |
| `POST /api/v1/ai/medicine-image-search` | 20 | 60 |
| `POST /api/v1/ai/barcode-lookup` | 20 | 60 |
| `POST /api/v1/ai/analyze-meal` | 20 | 60 |
| `POST /api/v1/ai/analyze-report` | 20 | 60 |
| `POST /api/v1/ai/generate-exercise-plan` | 20 | 60 |
| `POST /api/v1/ai/generate-diet-plan` | 20 | 60 |
