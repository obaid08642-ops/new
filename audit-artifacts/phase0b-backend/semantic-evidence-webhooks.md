# Phase 0B semantic evidence — Webhooks

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/webhooks/webhooks.service.ts:2–136`
- `src/modules/webhooks/webhooks.controller.ts:2–50`
- `src/modules/webhooks/webhooks.module.ts:2–10`

`webhooks.service.ts:9–63` implements timing-safe HMAC comparison for Moyasar and PayTabs and fail-closed behavior in production when secrets are missing; non-production missing-secret behavior accepts the webhook. `:65–75` stores replay keys in Redis with `SETNX` and 24-hour expiry. `:77–105` verifies and emits Moyasar/PayTabs events, but accepts arbitrary body/event names and returns success on dedup. `:107–117` uses optional SMS token validation; in non-production a missing token secret does not reject. `:119–135` uses LiveKit SDK verification and emits the resulting event.

`webhooks.controller.ts:8–12` makes the entire controller public by signature/header authentication rather than JWT. It accepts raw `body:any` and raw-body fallback `JSON.stringify(body)` for Moyasar/PayTabs/LiveKit, so signature correctness depends on global rawBody middleware being present and body canonicalization is unsafe when it is absent. Webhook event payloads have no DTO/schema/size/content validation. `webhooks.module.ts:5–10` registers only the controller/service.

## Findings candidates

The read supports: non-production fail-open webhook verification, raw payload/event injection, raw-body fallback signature mismatch/ambiguity, Redis dedup availability/TTL semantics, success-on-dedup ambiguity, SMS webhook optional-token behavior, and absence of persistence/audit/outbox/state processing in the webhook boundary.

No product code was changed and no tests/builds were executed during this semantic read.
