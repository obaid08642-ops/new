# Disk alert after the 2026-10-16 outage (#1603)

`deploy/scripts/monitor.sh` (cron, every 15 minutes) already mailed when `/` had less than 20 % free (#1446). The disk
still filled at 07:00 UTC and nobody acted for hours. The monitor now answers the question earlier and from more angles.
**Why the old alert did not prevent the outage** is read from the server by the read-only ops task
`69-inspect-alert-and-logs` (branch `review/ops-1603`): whether the monitor was scheduled and running, what it logged
and when, whether the mail could be sent. The findings are added here when the run is approved.

## What alerts now
| Alert | When | Why |
|---|---|---|
| `disk` (warn) | `/` under 20 % free | as before |
| `disk-crit` | under 10 % free **or under 5 GB** free | a percentage means little on a small disk; a new key, so it mails at once even while a warn alert is open |
| `disk-fill` | the free space lost over the last ~6 h (sample at least 2 h old, at least 300 MB lost) would reach zero in under 48 h | the outage was 5.8 GB in 18 h (~320 MB/h): this fires about a day before the disk is full, at any free % |
| `layer-<container>` | a container's own writable layer is over 1 GB (`docker inspect --size`) | what a container *wrote* (not its image): patient-web's cache would have alerted after ~3 h |
| `lognocap-<container>` | json log without `max-size` | a container created before the compose logging section has no rotation: its log grows for ever |
| `logsize-<container>` | one container's json log over 100 MB | compose caps it at 3 × 20 MB; more means the cap is not applied |
| `container-nabdah-redis-cache` | the cache Redis is not running / healthy | the page cache of patient-web (PR #1610) |

All limits are environment variables (`DISK_MIN_FREE_PCT`, `DISK_CRIT_FREE_PCT`, `DISK_CRIT_FREE_GB`, `DISK_FILL_HOURS`,
`DISK_FILL_MIN_MB`, `LAYER_MAX_MB`, `LOG_MAX_MB`) in `.env.production`.

## Daily summary mail
One mail a day (first run at or after 06:00 UTC, `MONITOR_SUMMARY_HOUR`) to `OPS_ALERT_EMAIL`: disk free and growth, open
alerts, the three biggest container layers, backup age. It is also the heartbeat: **a day without it means the monitor
(cron) or the mail path is broken** and is itself the alarm for what was invisible on 2026-10-16.

## Mail providers
A mail goes through the first provider that accepts it: Resend, then Brevo (REST API), then Mailjet (same order as the app,
PR #1583). A provider without its key in `.env.production` is skipped. Each failure is logged with the provider and the HTTP
code in `/var/log/nabdah-alerts.log`; if every provider fails the log says so.

## Tests
`tools/ops/monitor/test-monitor.sh` (CI `ops-monitor`): 28 checks with fake `df` readings, fake container stats and
stand-in provider endpoints: warn vs critical, the fill alert (slow loss does not alert), layer/log alerts (healthy and
non-nabdah containers do not), the summary once a day, the fallback order and the Brevo/Mailjet payloads.

## Still not covered (needs something outside the server)
If the server is down or cut off, it cannot mail. That is the external uptime check and status page (plan 20.6).
