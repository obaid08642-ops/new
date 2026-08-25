# Phase 0B semantic evidence — Service catalog and provider schedules

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/service-catalog/service-catalog.module.ts:2–215`

The module defines separate ownership and provider-schedule collections for lab/radiology services, with unique IDs and limited compound indexes (`service-catalog.module.ts:13–39`). Provider catalog access uses a role allowlist, maps ownership IDs to catalog documents, and returns broad service objects. Creation spreads the raw body into the catalog document, coerces price, creates ownership separately and emits an event best-effort (`54–116`). Updates spread arbitrary patch fields, perform ownership checks but use a non-atomic update/event sequence; delete removes catalog and ownership separately (`93–116`).

Admin listing supports raw regex search, returns up to 500 broad service documents and one ownership record per ID; admin approval toggles `active` based on entity type and returns ownership (`119–136`). Admin checks rely on `@Roles(UserRole.ADMIN)` metadata at the route. Schedule GET lazily creates default weekly hours in a GET; upsert copies only a fixed set of top-level fields but does not visibly validate weekly intervals, blocked dates, numeric bounds or timezone (`138–155`).

Available-slot generation parses caller date, uses JavaScript local-day helpers, default schedules and sequential optional booking-counter calls. It does not visibly validate date/timezone, provider/entity ownership, interval overlap, max-per-slot bounds or concurrent reservation state (`158–181`). Controllers use JWT globally, raw bodies and unconstrained `:type`/`:entity` values (`185–202`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: catalog mass assignment, ownership drift, broad admin disclosure, regex abuse, schedule default mutation, timezone/interval validation gaps, sequential availability races and mutation idempotency gaps.
