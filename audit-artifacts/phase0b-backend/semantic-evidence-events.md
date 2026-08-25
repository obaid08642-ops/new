# Phase 0B semantic evidence — Events and catalog publication

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/events/event-bus.service.ts:2–84`
- `src/modules/events/catalog-publication.service.ts:2–148`
- `src/modules/events/events.module.ts:2–16`

`EventBusService` durably creates a system event before in-process fanout and treats a duplicate-key error as a duplicate only when an idempotency key is supplied (`event-bus.service.ts:23–70`). It persists caller-supplied type/entity/actor/before/after/meta fields with no visible schema validation or PII redaction. Fanout failures are logged and swallowed after persistence, with no visible durable outbox/consumer retry state. Admin list accepts filters and a bounded limit up to 1000 but returns event documents via repository projection that excludes only `_id` and `__v` (`72–83`).

`CatalogPublicationService` resolves source collections by catalog type, derives operational/public/medical/indexing eligibility, builds canonical/deep-link/sitemap/feed metadata, writes a public projection, invalidates Redis keys, then emits an idempotent publication event (`catalog-publication.service.ts:7–148`). Source lookup uses `id`; canonical paths use `slug || id`, and no visible collision/slug validation exists. Projection update, cache invalidation and event emission are separate operations; a failure can leave projection/cache/event inconsistent. Actor scope is carried as input and not visibly authorized by this service. The projection copies provenance and review metadata and sets robots/indexability, making source-field correctness critical.

`EventsModule` is global, registers the system event schema/repository, admin events controller, and exports both services (`events.module.ts:9–16`). No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: raw event payload/PII exposure, incomplete outbox semantics, actor trust, projection/cache/event saga inconsistency, canonical collision and source eligibility drift, and global event-surface privilege coupling.

## Additional member — centralized event names

**Member read in full:** `src/common/events.ts:1–48`

The module centralizes string event names in an `EVENTS` constant and exports an `EventName` literal union (`1–48`). It covers user registration/role/login/guest conversion, order creation through delivery/cancellation/escalation/partial fulfillment, prescription lifecycle, medicine review, medication reminders/taken/missed, emergency lifecycle, delivery lifecycle and notification creation (`3–45`).

Centralized constants and the literal union reduce typos in compile-time consumers. This member defines names only; it does not define payload schemas, event IDs, timestamps, producer/actor/tenant fields, schema versions, correlation/causation IDs, idempotency keys, sensitivity classification, authorization, ordering, retry or delivery semantics (`1–48`). The opening comment says to avoid raw strings but no runtime registry/unknown-event rejection is present (`1–2`).

The event catalog omits visible payment/settlement/refund, insurance authorization, appointment/consultation/call, home-care/nursing, lab/radiology, consent/privacy, audit/security and catalog publication events, although those domains exist elsewhere in the backend (`1–45`). Similar lifecycle families can therefore drift or be represented through untyped raw strings. No completeness test or consumer compatibility matrix is present. No code was changed and no build/test/application operation was performed during this read.
