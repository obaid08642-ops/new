# Phase 0B semantic evidence — Catalog publication and event bus spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/events/catalog-publication.service.spec.ts:1–94`

The spec constructs `CatalogPublicationService` with mocked source/projection collections, Redis invalidation and event emitter (`16–25`). It verifies that an approved medicine projects as published but remains noindex until explicitly indexable, writes a noindex metadata projection, invalidates three Redis keys and emits an idempotent publication event (`27–50`). It verifies unapproved/pending source records produce a withdrawn/non-indexable/feed-excluded/sitemap-excluded projection (`52–65`).

The EventBus section checks duplicate-key persistence errors suppress fanout and that a newly persisted command fans out once (`68–92`). This is useful regression evidence for the intended persist-before-fanout/idempotency pattern, but the repository/emitter are mocks and no real unique index, transaction, retry, consumer acknowledgment, outbox durability, ordering, dead-letter, or concurrent duplicate behavior is proven (`69–92`).

Publication tests cover one medicine and two source states only. They do not cover provider/facility/catalog variants, deletion/recall/expiry, actor authorization, invalidation failure, stale cache, sitemap/feed/JSON-LD/canonical consistency, IndexNow lifecycle, URL/deep-link validation, projection PII allowlist, slug collision, locale completeness or post-publication HTTP/live API parity (`5–65`). The approved fixture intentionally stays noindex, so it does not demonstrate an indexable production path (`5–13,27–49`). No test was run and no product code was changed during this semantic read.
