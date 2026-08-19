# Phase 5 Backend/Database — event bus and outbox gaps

## Confirmed design strength

The event bus centralizes SystemEvent creation and fanout to notification, analytics and realtime listeners. It also provides a bounded filtered event-list method.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Event fanout proceeds even when durable event persistence fails | `emit` catches a repository create failure, then still sends the event through the in-process emitter. Users can receive state/notification signals with no durable audit/event record. | Use transactional outbox: persist state and event atomically, fan out only committed events, retry safely and alert/reconcile every delivery failure. |
| **P1** | Event stream has no idempotency/deduplication key or version/order guarantee | `create` records only payload fields; repeated retries/parallel transitions can create duplicate event/fanout effects with no source version or causal sequence. | Add immutable event ID, aggregate/version/causation/idempotency keys and unique/conditional write policy; make consumers idempotent. |
| **P1** | In-process emitter is not durable or cross-instance safe | Notification/realtime listeners run in the local Node process. A restart, horizontal deployment or consumer failure can lose/fork fanout behavior. | Use durable shared broker/outbox worker or a tested single-consumer architecture with retries/dead-letter/observability. |
| **P1** | Event queries are capped but have no cursor/retention/integrity metadata | List limits up to 1000 items with a basic since filter; no pagination cursor, retention/legal hold, event verification, viewer purpose or export audit appears in service. | Implement scoped cursor pagination, retention/hold policy, integrity/verifier metadata, permission/purpose filtering and audited export/view access. |

## Decision

Event propagation is **P0 FIX/BLOCKED** as cross-app source-of-truth infrastructure. State, audit, notification and realtime projections require a durable, idempotent outbox model before release validation.
