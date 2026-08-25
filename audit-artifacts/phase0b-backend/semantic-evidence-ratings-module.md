# Phase 0B semantic evidence — Ratings and reviews module

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/ratings/ratings.module.ts:1–112`

`RatingsService.submit` accepts a broadly typed user/body and validates only required identifiers, a fixed entity-type allowlist and numeric score range (`ratings.module.ts:17–24`). It does not verify that the caller owned/completed the referenced order/appointment/booking, that the supplied `provider_id` actually belongs to the entity, or that the service is eligible for review. The duplicate rule is find-then-update/insert, without unique index, transaction or idempotency; concurrent submissions can race, and an attacker may choose arbitrary provider/entity identifiers (`25–44`). It stores `user_name` and free-text comment, publishes immediately, and has no moderation, abuse/spam controls, profanity/sensitive-data handling, edit history, consent, retention or audit contract (`32–44`).

`recompute` aggregates published ratings and updates every provider profile matching `user_id` or `account_id` through a broad updateMany; it is a separate operation from rating write, so failures or races can leave denormalized averages stale, and the dual identity match can affect multiple profiles (`47–57`). Public provider ratings return broad rows with only `_id` excluded; no projection of user_name/comment, moderation-safe content, provider visibility or requester-specific privacy is enforced (`60–77`). Pagination parses query strings without finite/range validation; `Math.min` does not prevent negative/NaN behavior and there is no rate limit or max page/offset policy (`60–64,95–99`).

`mine` protects query by user_id but accepts unvalidated entity type/id and is not restricted to completed/owned service semantics (`80–82`). Controllers use `any`, and there is no explicit DTO/schema, idempotency decorator, audit decorator, moderation workflow, event/outbox, unique index registration or module-level rate/serializer policy (`85–112`). No product code was changed and no tests/builds were executed during this semantic read.
