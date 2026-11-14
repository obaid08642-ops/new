# External uptime alert (owner, 2026-11-02)

The site was down from about 13:20 UTC and no mail came: `deploy/scripts/monitor.sh` and the watchdog run on the host and die with it. The
check now also runs **outside** the server.

## What runs
`.github/workflows/uptime-alert.yml` (every 5 minutes) runs `tools/uptime/external-uptime.sh`: GET `https://nabd.plus/ar` and
`https://api.nabd.plus/api/v1/health/liveness` (GET only, 20 s timeout, one retry). Two failed runs in a row send **one** mail to the owner; one more mail
when it is back, with the duration. The state is kept between runs with the Actions cache, so a long outage is one mail, not one per run.
`REMIND_HOURS` (default off) can add a reminder every N hours. A mail that cannot be sent fails the run and is retried on the next one.

## Repository secrets the owner sets (names only)
`OPS_ALERT_EMAIL`, `MAIL_FROM`, and at least one provider: `RESEND_API_KEY`, or `BREVO_API_KEY`, or `MAILJET_API_KEY` + `MAILJET_SECRET_KEY`.
Tried in that order (as on the host). Settings > Secrets and variables > Actions. Then run the workflow once by hand ("Run workflow").

## Limits, plainly
- GitHub may delay a scheduled run by several minutes under load, so the real delay from outage to mail is about 10-15 minutes.
- GitHub switches scheduled workflows off after 60 days without repository activity (public repositories); a manual run turns it back on.
- The first outage mail needs the secrets above; without them the run is red with `MAIL NOT SENT` (GitHub then also notifies the repository owner).
- Not run against the real site or a real provider from here: only against a fake curl (`tools/ops/tests/test_external_uptime.py`).

## On-host alert noise
`deploy/scripts/monitor.sh` now mails at once only for what can take the site down or lose data: containers, mongodb, redis, the backend, the
CRITICAL disk level, backups. Warn-level disk, disk filling, container layers and logs, ram, load and certificates are logged and go into the one
daily summary mail (06:00 UTC) with the open alerts; a critical mail says how many others wait for the summary.
