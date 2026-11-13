# Runbook: events stuck in the dead-letter queue or the domain outbox

**Alerts:** `DeadLetterQueueHasDeadEvents` (any event is dead for 15 minutes), `DeadLetterQueueBacklog` (more than 50 events wait for a retry for 15 minutes), `DomainOutboxStuck` (an outbox entry is pending for over 30 minutes). Gauges: `nabd_event_dlq_dead`, `nabd_event_dlq_pending`, `nabd_domain_outbox_stuck` (`backend/src/common/event-queue-gauges.ts`, refreshed once a minute by `EventReliabilityService.refreshGauges`).

**What it means:** a listener that should have reacted to an event (a notification, a ledger line, a state change in another module) failed. The event is kept in `event_dlq`: it is retried up to 5 times and then marked `dead`. An outbox entry that stays `pending` is a state change that was written but not passed on.

## Diagnose
1. Admin: GET `/event-reliability/status` shows the counts and the last 20 pending events with their `last_error`; GET `/event-reliability/failed` lists the failed propagations.
2. One error repeated across many events = one broken listener or a provider outage (look at the API log for the same message right after the event time). A single dead event = a bad payload for that one entity.
3. A burst right after a deploy points at the change that went out: compare with the last deploy.

## Mitigate
- Cause fixed or provider back: retry from admin (`POST /event-reliability/retry-failed`, or the retry of one entry). Retry only after the cause is fixed.
- Do not delete dead events to make the number drop: they are the record of what was not done. Replay them (`replay`) once the listener is fixed.
- Outbox entries stuck with the API healthy: check the worker/cron that drains `domain_outbox` is running (see the cron-lease runbook `docs/platform/R3-cron-leases.md`).

## Verify
- `nabd_event_dlq_dead` and `nabd_domain_outbox_stuck` are 0 and `nabd_event_dlq_pending` is under 50, and the alert resolves after its 15 minutes.
