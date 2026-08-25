# Phase 0B semantic evidence — WebhooksService spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/webhooks/webhooks.service.spec.ts:1–95`

This Jest spec targets production fail-closed webhook verification. It resets/clones environment state and constructs `WebhooksService` with a mocked emitter and an in-memory Redis-like `setnx`/`expire` implementation (`5–29`). It covers missing Moyasar secret, missing Moyasar signature, valid Moyasar HMAC, duplicate Moyasar replay suppression, invalid and valid PayTabs HMAC, missing SMS token and wrong SMS token (`31–94`).

The tests provide focused source evidence that selected missing-secret/header paths reject and that a repeated exact Moyasar payload emits only once in the mocked store (`31–65`). They do not prove real Redis atomicity/TTL behavior, multi-instance race safety, event/outbox durability, webhook HTTP controller raw-body preservation, provider-specific canonicalization/encoding/case rules, timestamp/nonce freshness, payload schema validation, unknown event rejection, provider event-to-payment mapping, ledger/refund settlement, signature rotation or key management (`16–24,46–81`).

The valid cases assert only `status:'success'` and mocked event calls (`46–54,74–82`); no downstream payment state, idempotency record, replay window, transaction or reconciliation is asserted. The spec uses direct mutable `process.env` and does not cover non-production behavior, configuration schema validation, malformed raw JSON, huge payloads, duplicate IDs with different payloads, Redis failure/expiry, event publish failure or fail-closed behavior under storage outage (`11–29,31–94`). The comment labels timing-safe SMS verification, but timing behavior is not measured and real transport/controller context is absent (`90–94`). No test was run and no product code was changed during this semantic read.
