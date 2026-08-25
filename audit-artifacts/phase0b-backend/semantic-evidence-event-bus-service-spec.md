# Phase 0B semantic evidence — EventBusService durability spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/events/event-bus.service.spec.ts:1–19`

The spec creates `EventBusService` with `any`-cast mocked repository/emitter dependencies and covers two cases. If durable repository creation throws, the service rejects and does not call the emitter (`4–10`). If creation succeeds, the service resolves with `{ duplicate: false }` and emits the event after persistence (`12–18`).

These tests provide useful ordering/fail-closed evidence for the narrow service boundary: persistence is attempted before fan-out and persistence failure suppresses emission. They do not prove atomic transaction/outbox durability, broker delivery, consumer acknowledgement, retries/backoff/dead letters, event ordering, duplicate/replay behavior beyond one success return, payload schema validation, actor/tenant/PII policy or event versioning (`5–17`).

The mocked repository/emitter and direct service construction do not establish database uniqueness, concurrent emits, process crash recovery between persistence and fan-out, multi-consumer behavior, notification consistency, audit integrity or live broker/deployment parity. No code was changed and no build/test/application operation was performed during this read.
