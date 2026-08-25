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
