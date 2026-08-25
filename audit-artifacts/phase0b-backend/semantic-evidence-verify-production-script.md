# Phase 0B semantic evidence — Production verification script

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/scripts/verify-production.ts:1–52`

The script claims “comprehensive production launch verification” but checks only presence of five environment variables, Mongo connection state and a Redis ping (`7–38`). It requires `MONGO_URI`, while the application bootstrap/root connection uses `MONGO_URL` (`src/scripts/verify-production.ts:13` versus `src/app.module.ts:156–159` and `src/main.ts:37`), so verification can fail for a configured application or accept an environment variable the app does not use. It requires `GEMINI_API_KEY` and `MOYASAR_API_KEY` by name without proving the corresponding integrations are enabled, valid, reachable, scoped or safe.

It creates a full Nest application context from `AppModule` (`24`), which loads the entire runtime graph—including seed, legacy, compatibility and operational modules—rather than a side-effect-free verification graph. The script does not explicitly prevent scheduled jobs, workers, event handlers or other startup effects during verification. Mongo readiness checks global connection state and Redis ping has no timeout, dependency latency or queue/worker/payment/provider readiness (`26–38`).

On success it prints “SYSTEM IS FULLY VERIFIED AND READY FOR PRODUCTION” after only three categories of checks and does not validate HTTP listener/route contracts, auth/cookies, database indexes/migrations, encryption, webhooks, TLS, storage, mail/SMS, payment, rollback, observability, health semantics or absence of seed/mock data (`40–45`). On failure it calls `process.exit(1)` without a visible `finally` to close the application context (`46–49`), potentially leaving connections/resources open until forced exit. Errors are logged with only the message and no structured check report or redaction policy. No product code was changed and the script was not executed; no tests/builds were run during this semantic read.
