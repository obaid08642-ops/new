# Phase 0B semantic evidence — Admin events controllers

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/events/events.controllers.ts:1–30`

`AdminEventsController` exposes `admin/events` and applies `JwtAuthGuard` and `@Roles(UserRole.ADMIN)` at controller scope (`6–9`). The list endpoint accepts type/entity/pharmacy/patient/time/limit query strings and converts `since_minutes` and `limit` using `parseInt`, forwarding all filters to `EventBusService.list` (`12–24`). The trace endpoint accepts required-looking entity type/id parameters and requests up to 500 events (`26–29`).

The controller-level JWT/admin declaration is an explicit access boundary. However, this member has no visible query DTO, required/nonempty validation, numeric finite/range validation, safe enum allowlist, pagination cursor, maximum list limit, sort/order policy, timeout, redaction or response projection (`12–29`). `parseInt` can yield NaN, accept prefixes and permit negative/oversized values; `since_minutes` can produce invalid or future-derived dates. Trace has a fixed count but no pagination or time bound. Sensitive patient/pharmacy/entity filters are exposed to any principal accepted as ADMIN, with no visible tenant/least-privilege/audit-of-read control in this member. No code was changed and no build/test/application operation was performed during this read.
