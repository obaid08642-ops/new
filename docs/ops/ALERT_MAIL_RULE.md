# Alert mail: only on a real state change (owner, 2026-11-09)

**Why:** the owner got the same server alert mail every 10-15 minutes. `monitor.sh` (cron, every 15 min) mailed on every change of the set of critical alerts, and `nabdah-mongodb` (restarted by the memory pressure documented in `docs/platform/R7-data-tier.md`, 356 restarts) flipped between "container restarting" and "all OK again" every run: alert, recovery, alert, recovery. The backend watchdog mailed on every restart it did.

**The rule now**
- A critical alert (container, mongodb/redis/backend checks, critical disk, backup) is mailed only after it has been seen in **2 consecutive runs** (`ALERT_CONFIRM_RUNS`, default 2; a run is 15 minutes, so a real outage is mailed after about 30 minutes). A flap that never lasts two runs sends nothing.
- "All checks OK again" only after **2 consecutive clean runs** (`RECOVER_CONFIRM_RUNS`).
- The same state is never mailed twice: a new mail needs a key that the last mail did not name, or the repeat window (`ALERT_REPEAT_HOURS`, **24**, was 6) to pass while it lasts. A problem that comes back inside an outage that was already mailed is not mailed again.
- **Numbers never trigger a mail.** Memory %, free MB, load, disk-filling rate, warn-level disk, container layer/log sizes and certificates are not critical: they are logged and appear in the one daily summary mail only (which is also the heartbeat of the monitor).
- Backend watchdog (`backend-watchdog.sh`): it still restarts an unhealthy container at the 15-minute cooldown, but it mails **at most once per container per 6 hours** (`WATCHDOG_MAIL_HOURS`), and the mail says how many restarts and failed restarts there were since the last one.
- Every mail sent leaves a `mail sent` line in `/var/log/nabdah-monitor.log` so the mails of a day can be counted.

**What this does not change:** the external uptime check (GitHub Actions, `tools/uptime`) has its own two-run rule and still reports the site down; the daily summary mail stays; `MONITOR_TEST_MAIL` (98m) is unchanged.

**Rollout (the owner approves; nothing is applied by the repository)**
1. `98q-alert-mail-state.sh` (read-only): shows whether the host scripts already carry the rule, whether `.env.production` overrides `ALERT_REPEAT_HOURS` (an override of 6 there would defeat the new 24 h default), the monitor state and the mails per day.
2. `91c-host-files.sh` already lists `scripts/monitor.sh` and `scripts/backend-watchdog.sh`: dry run first, then `APPLY=yes` (copies from the newest checksummed release, keeps backups, `ROLLBACK=yes` puts them back). The cron lines (98m, 98k) are unchanged. No state migration: on the first run the new streak file starts from zero, and an alert already mailed is not mailed again.
3. `98q` again a day later: the mails-per-day line should show the alert, recovery and daily summary only.

**Tests:** `tools/ops/monitor/test-monitor.sh` (flap = no mail; a sustained outage = exactly two mails, alert and recovery; repeat after 25 h but not 23 h; six warn-level runs = no mail; only outage-class keys are mailable), `tools/ops/tests/test_backend_watchdog.py` (restarts go on, one mail per container per 6 h with the count, per-container gap, failed restarts), `tools/ops/tests/test_alert_mail_state.py`.
