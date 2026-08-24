# Phase 0B semantic evidence — provider-dashboard.service.ts

**Archive member:** `src/modules/provider/services/provider-dashboard.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–107; full 107-line member covered.

Lines 2–26 import request/availability/account/profile repositories and provider status enums, define provider-role assertion and local start/end-of-day helpers, and construct the dashboard service. Lines 28–57 implement `stats`: provider role is required, current local-day boundaries are calculated, a base filter `{account_id:user.id}` is used for request counts/aggregation, pending/completed/accepted/in-progress metrics are read in parallel, and completed `amount_total` is summed as `today_revenue` with hard-coded `currency: 'SAR'`.

Lines 59–64 implement recent requests using `{account_id:user.id}`, newest-first ordering and a caller-supplied limit with no explicit cap/validation. Lines 66–73 get availability by provider ID and create an OFFLINE record if missing, making a read endpoint implicitly mutate state. Lines 75–93 set availability after enum validation, upsert status/note and online/offline timestamps. Lines 95–106 return provider account, profile and availability for the authenticated provider.

**Confirmed security/correctness finding:** request records elsewhere in Provider services use `provider_account_id`, while this dashboard uses `account_id` at lines 32, 35–43 and 61. If the schema does not maintain both fields, dashboard stats/recent requests can return zero or wrong data. This is a concrete cross-layer field-name inconsistency requiring runtime/schema verification.

**Financial truthfulness:** `today_revenue` is derived by summing request `amount_total` regardless of payment settlement/refund/insurance/commission/ledger state, and currency is hard-coded SAR. It is therefore a gross request amount, not proven revenue. Missing amount aggregates to zero.

**Temporal/privacy:** local server-day boundaries are used without provider timezone; no DST or date input exists. Recent requests and `me` return request/profile/account data without pagination or explicit sensitive-field projection beyond repository behavior.

**Mutation/integrity:** availability upsert and status update lack visible idempotency, CAS, audit, transition policy, actor/device/session validation or notification/event side effects. `getAvailability` creates a record on read and can race across requests. Arbitrary `note` has no length/content bound visible.

**Truthfulness/fallbacks:** missing availability is represented as OFFLINE after creating a record, which may conflate unknown/unconfigured with explicitly offline. Dashboard metrics are derived from repository state but no consistency snapshot or stale indicator is returned. Recent request default limit is 3, but a caller may supply an unbounded/negative value subject to repository behavior.

**Price/payment/insurance source:** amount_total only; no authoritative payment, settlement, refund, insurance or commission source visible.

**Test implications:** require owner/stranger/unauth tests, provider_account_id/account_id schema alignment tests, gross-vs-settled revenue tests, currency/commission/refund handling, timezone/DST, pagination/limit bounds, read-without-write behavior, availability CAS/idempotency/audit, note validation, field projections and stale/consistency semantics. No tests executed during this semantic read.
