# Phase 0B semantic evidence — Event reliability and replay

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/event-reliability/event-reliability.module.ts:2–151`

The module defines `EventDlq` and `EventDelivery` collections and listens to `service.*` events to write delivery confirmations (`event-reliability.module.ts:17–59`). Delivery IDs use payload ID or a timestamp/random fallback, with no visible uniqueness or listener-attempt key; database failures are swallowed (`49–60`). DLQ entries persist the complete event payload and raw last error, with pending/retried/replayed/dead status and attempts (`62–74`).

Status counts delivered/failed events in the last 24 hours, counts pending/dead DLQ globally, returns recent pending DLQ documents and estimated total events without tenant/scope/redaction or freshness/coverage metadata (`76–97`). Retry loads up to 200 pending entries, emits each payload, marks retried after one success, increments attempts on failure, and marks dead at five attempts; operations are sequential, lack claim/lease/idempotency and swallow/retain raw errors (`99–118`). Replay loads a system event by ID and emits it without replay marker, uniqueness, authorization context, bounded attempts or mutation safety (`120–128`).

The controller is JWT+ADMIN guarded and exposes status, retry-failed and replay routes; mutations have no visible idempotency or approval boundary (`131–139`). Module registers three event collections and exports the service (`141–151`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: complete payload/error exposure, duplicate delivery records, DLQ claim/retry races, replay side effects, swallowed persistence failures, unbounded/raw admin status and missing tenant/retention policies.
