# Phase 0B semantic evidence — Unified workflow engine

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/workflow-engine/workflow-engine.module.ts:2–609`

The module defines the universal state enum mapping for pharmacy, lab, radiology, nursing and consultation, reverse lookup, a transition validator, runtime apply/transition, birth events, provider ranking/orchestration, public lifecycle/universal APIs, match endpoint, admin state-map debug and module wiring (`workflow-engine.module.ts:17–609`). Domain mappings compress many states into one universal state; unknown states throw, while reverse lookup returns all mapped literals (`37–162`).

`WorkflowEngineService.validate` checks universal transition legality and treats same-universal-state transitions as silently valid. `apply` runs a supplied mutation, emits a normalized event asynchronously with errors swallowed, or emits a rollback event on mutation failure; it does not itself atomically persist entity state, enforce current-state/version, idempotency or event durability (`178–297`). Birth event emission is also best-effort (`299–320`).

Provider ranking filters active profiles, applies insurance/facility conditions, scores capability/insurance/availability/distance and returns provider documents with `_score`; company/network/class arrays are dereferenced with no visible shape guards, location values are not range-validated, unknown distance receives a positive default score, and provider queries/facility lookups can be expensive (`327–479`). Orchestration creates a trace ID from kind/patient prefix/time, emits requested/matched events, then ranks providers; event failures are swallowed and trace IDs are not visibly persisted/idempotent (`481–525`).

Public lifecycle/universal endpoints expose all state maps/transitions and project caller-provided kind/state; match is JWT-only with raw body and no visible patient/tenant scope or idempotency (`527–585`). Module registers booking/provider/facility models and exports the engine (`597–609`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: non-atomic state transitions, swallowed event failures, same-universal-state bypass, public lifecycle disclosure, raw matching inputs, provider/insurance/location ranking defects, trace non-idempotency and broad provider output.
