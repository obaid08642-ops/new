# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE5_EVENT_BUS_OUTBOX_GAPS_20260819.md`
- **Member SHA-256:** `380ec809f669fced1483eee149b5d003c0f32c1d94fe9ebde32b000337943db9`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | **P0** | Event fanout proceeds even when durable event persistence fails | `emit` catches a repository create failure, then still sends the event through the in-process emitter. Users can receive state/notification signals with no durable`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `14: | **P1** | Event queries are capped but have no cursor/retention/integrity metadata | List limits up to 1000 items with a basic since filter; no pagination cursor, retention/legal hold, event verification, viewer purpose or export audit app`
### state_transitions
- `3: ## Confirmed design strength`
- `7: ## Confirmed defects`
- `11: | **P0** | Event fanout proceeds even when durable event persistence fails | `emit` catches a repository create failure, then still sends the event through the in-process emitter. Users can receive state/notification signals with no durable`
- `18: Event propagation is **P0 FIX/BLOCKED** as cross-app source-of-truth infrastructure. State, audit, notification and realtime projections require a durable, idempotent outbox model before release validation.`
### payment_insurance_relevance
- `12: | **P1** | Event stream has no idempotency/deduplication key or version/order guarantee | `create` records only payload fields; repeated retries/parallel transitions can create duplicate event/fanout effects with no source version or causal`
### error_empty_loading_retry_cancel
- `11: | **P0** | Event fanout proceeds even when durable event persistence fails | `emit` catches a repository create failure, then still sends the event through the in-process emitter. Users can receive state/notification signals with no durable`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
