# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE5_WORKFLOW_ENGINE_CONTRACT_GAPS_20260819.md`
- **Member SHA-256:** `a3079e5673da3b0919af573474bcf0083f1500571f85fc86e2382b1e62f2f077`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | **P0** | Mutation succeeds even if normalized event delivery fails | `apply` performs `mutate()` then catches/swallows `bus.emit` failure. A durable booking can therefore have no workflow event/notification/analytics/realtime projection. `
### backend_consumers_or_contracts
- `15: | **P1** | Matching endpoint authenticates but does not require an explicit caller-role/purpose scope | Any JWT bearer can call `/workflow/match` with arbitrary location/insurance/service criteria and receive provider profiles/ranking metad`
### auth_ownership
- `11: | **P0** | Central workflow policy is not enforced at the persistence boundary | Source declares every transition “MUST” use `WorkflowRuntimeEngine.apply`, but audited domain/admin/compatibility paths directly mutate `state`/`status` or use`
- `15: | **P1** | Matching endpoint authenticates but does not require an explicit caller-role/purpose scope | Any JWT bearer can call `/workflow/match` with arbitrary location/insurance/service criteria and receive provider profiles/ranking metad`
### state_transitions
- `3: ## Confirmed design strength`
- `7: ## Confirmed defects`
- `11: | **P0** | Central workflow policy is not enforced at the persistence boundary | Source declares every transition “MUST” use `WorkflowRuntimeEngine.apply`, but audited domain/admin/compatibility paths directly mutate `state`/`status` or use`
- `12: | **P0** | Unknown domain state silently maps to `REQUESTED` | `toUniversal` returns `REQUESTED` for any unmapped/misspelled/legacy state. Dashboards/timelines can represent corrupt or unrecognized state as a new request. | Return explicit `
- `13: | **P0** | Mutation succeeds even if normalized event delivery fails | `apply` performs `mutate()` then catches/swallows `bus.emit` failure. A durable booking can therefore have no workflow event/notification/analytics/realtime projection. `
- `16: | **P1** | Workflow map/version is public without contract versioning or migration metadata | Clients can read the map, but no map version/effective schema/legacy compatibility status is included. | Publish a versioned lifecycle contract wi`
- `20: The workflow engine is a strong intended architecture but remains **P0 FIX/BLOCKED** as a source of operational truth until direct mutations are eliminated, unknown states are fail-safe and event delivery becomes durable.`
### payment_insurance_relevance
- `13: | **P0** | Mutation succeeds even if normalized event delivery fails | `apply` performs `mutate()` then catches/swallows `bus.emit` failure. A durable booking can therefore have no workflow event/notification/analytics/realtime projection. `
- `15: | **P1** | Matching endpoint authenticates but does not require an explicit caller-role/purpose scope | Any JWT bearer can call `/workflow/match` with arbitrary location/insurance/service criteria and receive provider profiles/ranking metad`
### error_empty_loading_retry_cancel
- `12: | **P0** | Unknown domain state silently maps to `REQUESTED` | `toUniversal` returns `REQUESTED` for any unmapped/misspelled/legacy state. Dashboards/timelines can represent corrupt or unrecognized state as a new request. | Return explicit `
- `13: | **P0** | Mutation succeeds even if normalized event delivery fails | `apply` performs `mutate()` then catches/swallows `bus.emit` failure. A durable booking can therefore have no workflow event/notification/analytics/realtime projection. `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
