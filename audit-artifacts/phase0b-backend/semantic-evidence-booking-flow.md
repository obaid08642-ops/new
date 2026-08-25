# Phase 0B semantic evidence — Unified booking flow

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/booking-flow/booking-flow.module.ts:2–259`

`BookingFlowService` normalizes five domains through aliases, fetches an entity with patient/provider/admin ownership filters, derives universal state, provider snapshot, event-derived steps, next actions and recovery options (`booking-flow.module.ts:22–169`). Provider ownership is a broad OR over several fields and provider role detection is a role/provider-type allowlist; there is no visible account-status/tenant validation (`42–64`). Status returns total from domain fields and exposes provider name/phone/city/rating projection, while steps rely on event presence and may differ from stored state (`103–169`). Timeline returns complete state history and all matching events (`172–180`).

Retry permits patient/provider/admin callers who own the entity, accepts only requested/matching universal state, then invokes workflow engine with same from/to state and swallows errors before returning success (`183–200`). The comment says it re-emits a matched signal, but the visible operation delegates to engine apply and the truth of dispatch is not returned. Admin resolve requires admin role manually, accepts force-complete/cancel and raw reason, then updates the domain record with separate workflow/event behavior; update result is not checked (`202–229`).

The controller is JWT guarded and exposes status/timeline/retry/resolve with raw type/id/body parameters and no visible idempotency on mutations (`232–240`). The module wires all five booking models, provider profile, system events and workflow engine (`242–259`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: broad ownership heuristics, event/state divergence, timeline PII, retry false-success/idempotency gaps, force resolution risks, unverified price outputs and missing update-result validation.
