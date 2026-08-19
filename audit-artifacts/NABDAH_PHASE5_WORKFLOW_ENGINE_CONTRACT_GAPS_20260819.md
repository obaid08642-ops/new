# Phase 5 Backend/Database — unified workflow engine gaps

## Confirmed design strength

The Backend contains a clear universal lifecycle and a central `WorkflowRuntimeEngine` intended to normalize pharmacy, laboratory, radiology, nursing and consultation transitions while emitting `service.*` events. The public lifecycle contract is useful for typed client integration.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Central workflow policy is not enforced at the persistence boundary | Source declares every transition “MUST” use `WorkflowRuntimeEngine.apply`, but audited domain/admin/compatibility paths directly mutate `state`/`status` or use domain-specific transitions. | Move transition authorization/validation into a mandatory shared persistence/domain layer; prohibit direct state writes through lint/CI/repository patterns and add cross-domain invariant tests. |
| **P0** | Unknown domain state silently maps to `REQUESTED` | `toUniversal` returns `REQUESTED` for any unmapped/misspelled/legacy state. Dashboards/timelines can represent corrupt or unrecognized state as a new request. | Return explicit `UNKNOWN`/validation error with telemetry and migration handling; make every mapping exhaustive and tested per persisted enum/version. |
| **P0** | Mutation succeeds even if normalized event delivery fails | `apply` performs `mutate()` then catches/swallows `bus.emit` failure. A durable booking can therefore have no workflow event/notification/analytics/realtime projection. | Use transactional outbox/idempotent event delivery with retry/monitoring and reconciliation; do not silently discard state-projection failures. |
| **P1** | Ranking uses unverified profile availability and grants a default distance score | `is_online`, working-hours and profile location determine ranking; unknown distance receives seven points rather than a separately declared unavailable/location-policy result. | Base matching on server-acknowledged availability/capacity, consented location/service area and verified schedule; filter/rank unknown location according to explicit policy and show explainable result reason. |
| **P1** | Matching endpoint authenticates but does not require an explicit caller-role/purpose scope | Any JWT bearer can call `/workflow/match` with arbitrary location/insurance/service criteria and receive provider profiles/ranking metadata. | Add patient/authorized-system role and purpose controls, request rate limits, privacy-minimized DTO and audit; verify patient/provider/admin negative cases. |
| **P1** | Workflow map/version is public without contract versioning or migration metadata | Clients can read the map, but no map version/effective schema/legacy compatibility status is included. | Publish a versioned lifecycle contract with deprecation/migration metadata and client compatibility tests. |

## Decision

The workflow engine is a strong intended architecture but remains **P0 FIX/BLOCKED** as a source of operational truth until direct mutations are eliminated, unknown states are fail-safe and event delivery becomes durable.
