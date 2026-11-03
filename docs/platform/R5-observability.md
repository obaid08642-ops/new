# R5 - Observability: tracing, metrics, RED dashboards, SLOs by route class (2026-11-03)

## What already existed (found, not rebuilt)
- `GET /api/v1/observability/metrics`: Prometheus text, protected by `METRICS_SCRAPE_TOKEN` (>= 32 chars, 404 otherwise; `MetricsScrapeGuard`). Per route: requests, 5xx, duration histogram, p50/p95/p99, plus event-loop lag, heap, rss and registered gauges (sockets, queues). The worker listens on its own port with the same controller, so Prometheus must scrape **both** containers (`backend`, `worker`).
- `SLO_TARGETS` (`common/slo-targets.ts`), `SloAlertsService` (in-process burn-rate and p95 rules, mails/push the owner, runbook links, `docs/SLO_ALERTS_20.5.md`), `ops/prometheus/nabd-alerts.yml`, `ops/grafana/dashboards/nabd-api-overview.json`, Sentry (errors, 10 % traces and profiles in production).
- External uptime alert from outside the server: `.github/workflows/uptime.yml` + `tools/uptime/external-uptime.sh` (#2407): `/ar` and `/api/v1/health` every 5 minutes, one mail after two failures, one on recovery.

## What this PR adds
1. **Route classes** (`common/route-classes.ts`): payment, auth, booking, search, public_read, user_read, realtime, admin, other, decided by the first path segment. The scrape now also carries `nabd_http_class_{requests,errors}_total`, `..._duration_ms_{sum,bucket}` and `nabd_http_class_p95_ms{class}` (9 series sets instead of hundreds of route patterns).
2. **RED dashboard as code**: `ops/grafana/dashboards/nabd-red-by-class.json` (Rate, Errors, Duration p95 two ways, cron leases, event-loop delay).
3. **Alert rules by class** in `ops/prometheus/nabd-alerts.yml`: `ClassP95High`, `PaymentErrorRatio` (> 0.5 % 5xx on payment routes), `CronLeaseLost` (R3).
4. **Cron lease counters** (R3) exposed as Prometheus counters: `nabd_cron_lease_{ran,skipped,unavailable,lost}_total` (`registerGauge` got an optional `counter` type).
5. **Tracing helpers** (`common/trace.ts`): `traced()` wraps a queue consumer in a Sentry span (applied to the notification-delivery processor); `currentTraceId()` puts `trace_id` on structured log lines inside a traced request/job (absent otherwise, so existing log shapes do not change).
6. **Drift guard** (`observability-r5.spec.ts`): every `nabd_*` metric named in a Prometheus rule or a Grafana dashboard must be emitted by `scrape()`, the class p95 numbers in the rule must equal `route-classes.ts`, every dashboard panel has a query. A renamed metric fails CI instead of silently blanking a dashboard.

## Tracing: decision
The brief asked for OpenTelemetry (HTTP, Mongo, Redis, BullMQ, outbound calls). The API already runs Sentry's SDK, which is built on OpenTelemetry and auto-instruments HTTP, MongoDB/Mongoose, ioredis and outbound `fetch`/`http` (`instrument.ts`). Adding a second OpenTelemetry SDK next to it would instrument everything twice and cost memory on a host that was OOM-killing mongod today (R1). So: keep Sentry as the one tracing pipeline, add the spans it lacks (BullMQ consumers via `traced()`, durable-event deliveries once R2 #2410 is merged: wrap `DurableEventsService.process` the same way), and correlate logs by `trace_id`. If the owner later wants an OTLP backend (Tempo/Jaeger/Honeycomb), Sentry's OTel exporter or a collector sidecar is the path; it belongs on the second host (R15), not on the app host. Sampling stays 10 % (cost); `tracesSampler` per route class (100 % for payment, 1 % for public reads) is a one-line follow-up once the traffic is real.

## SLOs by route class (PROPOSED, owner to approve)
| class | p95 target | availability | examples |
|---|---|---|---|
| payment | 400 ms | 99.95 % | payments, moyasar, finance, refunds, wallet, coupons |
| auth | 400 ms | 99.9 % | auth, otp, sessions, devices |
| booking | 500 ms | 99.9 % | orders, care/appointments, labs, radiology, home-care, pharmacy, slot-locks, insurance |
| public_read | 300 ms | 99.9 % | health, content, public, geo, doctors, services |
| user_read | 500 ms | 99.9 % | users, notifications, loyalty, chat, prescriptions |
| search | 800 ms | 99 % | search, medicines, catalogs |
| realtime | 1000 ms | 99 % | livekit, calls |
| admin | 1500 ms | 99 % | admin |
Global API availability stays 99.9 % (30 d). The in-process `SloAlertsService` keeps paging on the OLD rule (p95 > 500 ms per first-path-segment group) until these are approved; the class rules above are for Prometheus. The numbers are starting points chosen from the existing 500 ms rule and the measured targets in `docs/perf/load-test-2026-10-30.md`, not from production percentiles: check them against a week of real data before they page anyone.

## Where Prometheus and Grafana run (decision needed, no price verified here)
There is no Prometheus on the production host, and RAM there is exhausted. Options: (a) Grafana Cloud free tier with a small Alloy/Prometheus agent scraping both containers (the agent needs about 100-150 MB: only after the RAM upgrade); (b) Prometheus + Grafana on the standby VPS planned in R15; (c) nothing new: keep `SloAlertsService` (already pages by mail/push) plus the external uptime workflow. Prices for (a) and the VPS are not stated here because I did not check current price lists; R15 lists the VPS candidates with prices. Until (a) or (b) exists, the rules and dashboards are tested definitions, not running alerts.

## Wiring to the external alert (#2407)
Already independent of the host: `uptime.yml` mails the owner when the page or `/api/v1/health` fails twice. A further external probe of `/api/v1/observability/health-slo` was NOT added: that endpoint reports the error ratio since process start, so a restart or an old incident would flap it. A windowed version (last 5 minutes from the SLO service's snapshots) would make a good external probe; follow-up.

## Not done
No OTLP exporter, no per-class `tracesSampler`, no Prometheus/Grafana deployment, no alert-fire drill (the Prometheus rules cannot fire until something evaluates them).
