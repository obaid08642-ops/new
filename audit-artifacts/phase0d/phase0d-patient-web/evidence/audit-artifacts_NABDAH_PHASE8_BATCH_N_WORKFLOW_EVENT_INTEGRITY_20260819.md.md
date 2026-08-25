# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_N_WORKFLOW_EVENT_INTEGRITY_20260819.md`
- **Member SHA-256:** `d43ac132f5f3f6a21cff4675b0a469faa1b099f98012c1583e8c9e43d39b463b`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: | Branch upload | **PASS** — source commit `28524aa` (`fix: fail closed workflow event persistence`) is on `manus/on-live-reconciliation`. |`
- `28: This batch hardens the canonical mapper and event boundary; it does **not** claim every historical direct state write across every module has yet been migrated into a transaction/outbox-backed workflow transition. Phase 8 must continue that`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `28: This batch hardens the canonical mapper and event boundary; it does **not** claim every historical direct state write across every module has yet been migrated into a transaction/outbox-backed workflow transition. Phase 8 must continue that`
### state_transitions
- `5: Phase 5 established two cross-domain integrity gaps: an unrecognized domain state silently mapped to universal `REQUESTED`, and the event bus delivered in-process effects even if durable event persistence failed. This can produce misleading`
- `11: | State normalization | `toUniversal` now trims/normalizes an input and throws `unknown_domain_state` for a state not explicitly declared in the domain map. It no longer silently falls back to `REQUESTED`. |`
- `12: | Event durability boundary | Event bus persistence happens before in-process fanout. If durable event creation fails, `emit` logs and rethrows; no `EventEmitter2` notification is delivered. |`
- `19: | Focused workflow/event regression | **PASS** — 2 suites, 4 tests. It proves unknown-state rejection, deterministic declared mapping, no fanout after persistence failure, and fanout only after persistence. |`
- `28: This batch hardens the canonical mapper and event boundary; it does **not** claim every historical direct state write across every module has yet been migrated into a transaction/outbox-backed workflow transition. Phase 8 must continue that`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: Phase 5 established two cross-domain integrity gaps: an unrecognized domain state silently mapped to universal `REQUESTED`, and the event bus delivered in-process effects even if durable event persistence failed. This can produce misleading`
- `13: | Existing callers | Callers that deliberately tolerate non-critical notification/audit loss retain explicit `.catch(...)`; they are now visible policy decisions rather than a central hidden fanout behavior. |`
- `28: This batch hardens the canonical mapper and event boundary; it does **not** claim every historical direct state write across every module has yet been migrated into a transaction/outbox-backed workflow transition. Phase 8 must continue that`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
