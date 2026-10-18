# SLOs and alerts that reach the owner (20.5)

Plan 20.5: "API availability 99.9%, checkout success rate, and p95 per route group. Alerts to the owner (email + push/WhatsApp/Telegram),
each with a runbook link. Verify: each alert fired once in a drill."

## What was missing
The objectives (`backend/src/common/slo-targets.ts`), Prometheus rules (`ops/prometheus/nabd-alerts.yml`) and runbooks (`docs/runbooks/`) existed,
but **nothing evaluated them**: there is no Prometheus on the production server, and no code sent the owner anything. An outage could burn the
budget with no message. (The external checks of 20.6 and `deploy/scripts/monitor.sh` cover "the API does not answer"; this covers "it answers, but fails or is slow".)

## What runs now
`SloAlertsService` (`backend/src/modules/observability/slo-alerts.service.ts`) runs in the API process once a minute. It keeps the last 70 snapshots of the
counters `MetricsService` already holds (requests, 5xx, latency histogram per route) and diffs two snapshots to get any window. A rule is evaluated
only when the history fully covers its window and the window has a minimum of traffic, so a restart or a quiet night cannot page anyone.

| Alert | SLO | Fires when | Needs | Severity | Runbook |
|---|---|---|---|---|---|
| `api_availability_fast` | 99.9% availability | 5xx ratio over 5 min > 1.44% (14.4 x the 0.1% budget), 2 checks in a row | 30 requests | critical | `docs/runbooks/api-availability.md` |
| `api_availability_slow` | 99.9% availability | 5xx ratio over 30 min > 0.6% (6 x the budget), 5 checks | 100 requests | warning | same |
| `checkout_success` | checkout success 99% | 5xx on `*checkout*` routes over 15 min > 1%, 3 checks | 10 requests | critical | `docs/runbooks/checkout-failures.md` |
| `p95_latency` | p95 <= 500 ms per route group | p95 of a route group (first path segment, e.g. `/orders`) over 15 min > 500 ms, 3 checks | 30 requests in the group | warning | `docs/runbooks/slow-api.md` |
| `event_loop_lag` | event-loop delay <= 100 ms | over 100 ms in each of the last 5 checks | none | warning | `docs/runbooks/slow-api.md` |

A firing alert is sent once, repeated every `SLO_ALERT_REPEAT_MINUTES` (default 240) while it stays on, and "RESOLVED" follows after 3 clear checks.
Every message carries the rule, the numbers, since when, and the runbook URL (`RUNBOOK_BASE_URL`, default the GitHub `main` tree).
Events are stored in Mongo `slo_alert_events` (90-day TTL). `GET /observability/alerts` (admin, `ops.queues.manage`) shows the rules, which are firing, which channels are configured and the latest events.

## Channels (all optional, each fails on its own)
| Channel | Configure in `.env.production` | Notes |
|---|---|---|
| Email | `OPS_ALERT_EMAIL` | sent through MailService (Resend, then Brevo, then Mailjet) |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID` | create a bot with @BotFather, send it a message, read the chat id from `getUpdates`; the token is never logged or stored in events |
| Push | `OPS_ALERT_PUSH_USER_IDS` (comma-separated admin account ids) | the app's PushService to those accounts' registered devices |
| WhatsApp | not implemented | needs a WhatsApp Business API account and template approval (owner decision); Telegram is the free equivalent |

`SLO_ALERTS=off` turns the evaluator off.

## The drill (Verify: each alert fired once)
- `POST /observability/alerts/drill {"rule": "<id>"}` (admin, `ops.queues.manage`) sends the real notification of one rule, marked `[DRILL]`, through every configured channel, and leaves no alert "firing".
- The spec `slo-alerts.spec.ts` drives each rule with synthetic traffic and a fake clock: each fires **once** (not on every check), repeats only after the repeat interval, resolves once, and a drill sends one message per rule with its runbook link.
- The production drill (all five rules to the real mailbox) is an ops task run with the owner's approval after the deploy.

## Limits, said plainly
- It sees only what this API process served and resets on restart (counters restart too, so it needs 5 to 30 minutes of history before a rule can fire).
- The worker process has no HTTP traffic, so it is not evaluated; its queues and crons are watched by `monitor.sh` and the admin queue monitor.
- No Prometheus/Alertmanager/Grafana was added (owner approval needed). The Prometheus rules stay in the repo as the same objectives in another engine.
