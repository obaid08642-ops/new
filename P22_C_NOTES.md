# P22-C Notes — PLATFORM slice (feature-flags, analytics, admin, risk, fraud, provider, search, locations)

Owner modules: `backend/src/modules/{feature-flags,analytics,admin,risk,fraud,provider,search,locations}` (+ their schemas/DTOs/specs).
Everything else READ-ONLY. No docker. Mocked repos (mongodb-memory-server SIGABRTs). No `npm install` (symlinked node_modules). One task = one commit `[P22.<task>]`.

## INVENTORY (verified, not trusted)

### 22.10 Experiments & analytics
- `% rollout_percentage`: storage EXISTS (read path only). `ConfigService.getClientConfig()` reads `feature_flags` rows incl. `rollout_percentage` (`backend/src/modules/config/config.service.ts:31`). No schema field declares it (both flag schemas lack it: module-local `{key,enabled}`, canonical `{flagName,isEnabled}`), no variant/bucketing/guardrail/report code anywhere. → BUILD-NEW on top of existing read path.
- Analytics infra EXISTS: `AdminAnalyticsService` + `AdminAnalyticsController` (`backend/src/modules/analytics/analytics.module.ts`), `AnalyticsSuiteService` (funnel/cohorts/provider-league/search-CTR/ranking-modes/nps/anomalies, `backend/src/modules/admin/enterprise/analytics-suite.service.ts`), `analytics_events` schema (`backend/src/schemas/analytics-event.schema.ts`), `AdminAnalyticsSuiteController` + scheduled reports. MISSING: consent-gated ingest pipeline, privacy stripping, idempotent writes, funnel/retention compute over seeded privacy-respecting events, sink abstraction (no ClickHouse/BigQuery anything). → BUILT-ON-EXISTING.
- Separate analytics store: NOTHING exists. → config/sink abstraction + docs NEW; provisioning BLOCKED (infra).

### 22.11 Fraud & risk
- EXISTS: `fraud-monitoring.tsx` admin page (read-only view over governance fraud-alerts/audit-logs), `fraud_alerts` schemas (`backend/src/schemas/fraud-alert.schema.ts`, `admin/web-core/schemas/fraud-alert.schema.ts`), `DeviceLimitGuard` (max 3 accounts/device, `backend/src/common/guards/device-limit.guard.ts`), `FraudService` in finance-engine (READ-ONLY, not mine): refund abuse, payment velocity, coupon abuse, duplicate payments. Governance fraud-alerts read API exists (web-core admin-governance.controller).
- MISSING: scoring for fake orders / COD abuse / account farms / promo abuse / payment fraud, 3-D Secure hooks, risk dashboard API (scores+queues+actions). → BUILT-ON-EXISTING.
- Gateway capabilities (READ-ONLY inspection): `PaymentGateway` contract (`payments/payment-gateway.ts`), adapters Stripe/Tap/Moyasar selected by `PAYMENT_PROVIDER`; Moyasar hosted checkout w/ `payment_url` redirect + webhook HMAC (`moyasar.module.ts`). No 3DS-specific code paths found. → 3DS hooks built as capability/recommendation layer only.

### 22.12 Provider quality
- EXISTS: `ProviderScoringService` (`provider/services/provider-scoring.service.ts`): acceptance/completion/response-time → `reliability_score` 0..100 snapshot; `ProviderMatchingService` already consumes snapshots (`reliability` 150pts of 1000). `provider-league` analytics exists (acceptance/cancel/rating/GMV per provider).
- MISSING: scorecards incl. ratings + complaints + cancellations + time-to-accept computed from real data w/ DB-match test; threshold-breach admin alerts; mystery-shopper procedure/checklist/template. → BUILT-ON-EXISTING.

### 22.16 City operations
- EXISTS: `Location` schema + public/admin CRUD (`location/` module: regions/cities/districts, coverage flags, soft-delete). `service_area_cities: string[]` is a data field on provider profiles (no geometry/zone-rule entity, no launch switches, no coverage API).
- MISSING: service-area CRUD w/ geometry+zone rules, city launch switches, provider coverage API. → BUILT-NEW inside owned `location` (+ `provider`) modules.

## Task log
(see per-task sections below)

### 22.10 Experiments and analytics — BUILT-NEW on existing stores
Files:
- `backend/src/modules/feature-flags/experiment-bucketing.ts` — pure sticky bucketing (djb2/FNV hash→[0,100), rollout gate→off, weighted variants), guardrail eval, reportResult/winner math.
- `backend/src/modules/feature-flags/experiment.dto.ts` — Create/Assign/Convert/Report DTOs, fully validated (weights sum + ≥2 variants + reserved-name checks in service).
- `backend/src/modules/feature-flags/experiment.service.ts` — experiments/assignments/conversions collections (raw conn, `$eq` queries, idempotency keys on every write); sticky assign, convert, report (per-variant rates + winner + guardrail breaches); stop.
- `backend/src/modules/feature-flags/experiment.controller.ts` — `admin/experiments` CRUD/assign/convert/report (admin-guarded).
- `backend/src/modules/feature-flags/feature-flags.module.ts` — EDIT (owned): registers ExperimentService/Controller. No app.module change needed.
- `backend/src/modules/analytics/analytics-sink.ts` — `AnalyticsSink` interface + `MongoAnalyticsSink`; all report reads go through it.
- `backend/src/modules/analytics/analytics-event.service.ts` — consent-gated idempotent ingest (identified events need analytics consent; strips ip/user_agent/ip by default; unknown types rejected), sink-backed funnel + weekly D1/D7/D30 retention cohorts.
- `backend/src/modules/analytics/analytics-event.controller.ts` — public `analytics/events` ingest + `admin/analytics-pipeline` funnel/retention.
- `backend/src/modules/analytics/analytics.module.ts` — EDIT (owned): registers new service/controllers.
- `backend/src/modules/analytics/ANALYTICS_SINK.md` — ClickHouse/BigQuery migration guide.
Tests: 17 (10 experiment incl. in-suite reported-result winner=B @100% vs A single conversion + guardrail breach flip; 7 analytics incl. consent-gate drop, idempotency, PII strip, funnel counts [100,40,10], cohort D1=50%, sink-routing spy).
Proofs (break→red→restore): sticky lookup disabled → `sticky bucketing` FAIL (1 failed/9 skipped); consent gate removed → `consent gate` FAIL (1 failed/6 skipped); restored → 17/17 green. tsc --noEmit clean (0 errors in new files).
Contracts: existing `feature_flags.rollout_percentage` read path untouched; new writes carry idempotencyKey; queries use `{ $eq }`; no `any` in new code.
BLOCKED: warehouse provisioning needs owner infra decision (ClickHouse/BigQuery instance + creds + backfill).
DEFERRED-NEED: none (no app.module/common/other-module edits).
Live journey (other agent): create exp → assign 2 subjects twice (same variant) → convert → report shows winner; ingest identified event w/o consent → consent_required + 0 rows; admin funnel/retention reflect seeded events.
