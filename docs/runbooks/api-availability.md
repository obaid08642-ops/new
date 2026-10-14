# Runbook: API availability SLOBurn

**SLO:** 99.9% availability, 30-day window (`slo-targets.ts` → `api_availability`).

## What fired
The 5xx ratio exceeded 0.1% for 10 minutes.

## Diagnose
1. `curl -s $API/observability/summary | jq` — which routes are erroring, and at what rate.
2. Group by route: a single route is a feature bug; all routes is the process or its database.
3. Check Mongo and Redis reachability and latency. `nabd_http_p95_ms` rising with the error
   ratio points at a dependency, not application code.

## Mitigate
- Roll back the last deploy if the onset lines up with a release.
- Raise replicas to shed load if it is saturation.
- If a dependency is down, disable the affected feature flag rather than returning 500.

## Verify
The error ratio returns under 0.1% and stays there for 10 minutes.
