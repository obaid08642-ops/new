# Runbook: Slow routes / event-loop lag

**SLOs:** p95 < 500ms per route; event-loop delay < 100ms (`slo-targets.ts`).

## Diagnose
1. `nabd_event_loop_lag_ms` is the early signal: if it is climbing while p95 has not moved
   yet, the process is about to be slow.
2. `nabd_heap_used_bytes` trending up without GC recovery suggests a leak.
3. Find the slow routes with `nabd_http_p95_ms` sorted descending.
4. For one slow route, take its request id from the log and read the audit trail for it.

## Mitigate
- Restart the instance to clear a leak; it is the fastest mitigation when lag is the signal.
- Move work off the request path (a synchronous loop over many records is the usual cause).

## Verify
p95 under 500ms and event-loop delay under 100ms for 15 minutes.
