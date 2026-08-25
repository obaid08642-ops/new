# Phase 0B semantic evidence — Tour progress

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/tour/tour.service.ts:2–23`
- `src/modules/tour/tour.controller.ts:2–19`
- `src/modules/tour/tour.module.ts:2–14`

`TourController` applies JWT guard and exposes GET `/tour/status` and POST `/tour/complete`; it passes the current user ID and raw `stepId` directly to the service (`tour.controller.ts:5–18`). `TourService` reads `user.tour_progress` and returns the raw array, then adds any caller-provided step ID with `$addToSet` and always returns `{ok:true}` without validating that the user exists, the step is known/allowed, or completion is idempotently audited (`tour.service.ts:5–21`).

The module registers the User model, controller and service (`tour.module.ts:7–14`). No visible versioned tour definition, locale/step lifecycle, reset/restart semantics, rate limit, field projection or audit event is present. Unknown step identifiers can persist permanently in the user profile and update failures are not surfaced as a truthful result.

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: raw user progress exposure, arbitrary step injection, missing user/not-found handling, mutation audit/idempotency gaps, and absence of a versioned tour contract.
