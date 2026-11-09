#!/bin/bash
# Is the alert-mail rule of 2026-11-09 (owner: mail ONLY on a real state change) really in force on the host, and how many mails go out? READ-ONLY, one run, `status:` lines only; nothing is
# written, installed or restarted. The scripts reach the host with 91c-host-files.sh (it already lists scripts/monitor.sh and scripts/backend-watchdog.sh: dry run first, APPLY with backups,
# ROLLBACK), the cron lines exist already (98m, 98k): this task is the before/after check around that run.
#   1 scripts   do the host's monitor.sh and backend-watchdog.sh carry the new rule (ALERT_CONFIRM_RUNS, RECOVER_CONFIRM_RUNS, a 24 h repeat default; the watchdog's mail gap)? Names and yes/no only
#   2 settings  is ALERT_REPEAT_HOURS / ALERT_CONFIRM_RUNS / RECOVER_CONFIRM_RUNS / WATCHDOG_MAIL_HOURS set in .env.production? Only a number is ever shown, and only for these four names:
#               an override of ALERT_REPEAT_HOURS=6 there would make the new 24 h default of the script moot
#   3 state     the monitor's state files: which critical keys are in a streak and how long, the clean-run streak, which keys the last mail named, and how old that mail is
#   4 mails     "mail sent" lines of the monitor log (written since the new script runs) per day for the last 7 days, and the mail-failure lines in the alert log, with the subject's first
#               words only (alert text names containers and disks, never a secret)
#   5 watchdog  per container: the time of its last mail and the restarts / failed restarts counted since it
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ST=${OPS_MONITOR_STATE_DIR:-/var/lib/nabdah-monitor}
WST=${OPS_WATCHDOG_STATE_DIR:-/var/lib/nabd-watchdog}
LOGD=${OPS_LOG_DIR:-/var/log}
ENVF=$D/.env.production
NOW=${OPS_NOW_EPOCH:-$(date +%s)}
say() { echo "status: alert-mail-state: $*"; }
echo "## alert-mail-state (read-only)"
has() { sudo -n grep -q -- "$2" "$1" 2>/dev/null && echo yes || echo no; }

# 1 scripts
M="$D/scripts/monitor.sh"; W="$D/scripts/backend-watchdog.sh"
if sudo -n test -f "$M"; then say "monitor.sh on the host: confirm-runs rule=$(has "$M" 'ALERT_CONFIRM_RUNS'), recover rule=$(has "$M" 'RECOVER_CONFIRM_RUNS'), repeat default 24 h=$(has "$M" 'ALERT_REPEAT_HOURS:-24'), mail-sent log=$(has "$M" 'mail sent')"; else say "monitor.sh is NOT on the host at $M"; fi
if sudo -n test -f "$W"; then say "backend-watchdog.sh on the host: mail gap rule=$(has "$W" 'WATCHDOG_MAIL_HOURS')"; else say "backend-watchdog.sh is NOT on the host at $W"; fi
say "if any of these says no: run 91c-host-files.sh (dry run, then APPLY) so the scripts reach the host"

# 2 settings (numbers of four names only)
for v in ALERT_REPEAT_HOURS ALERT_CONFIRM_RUNS RECOVER_CONFIRM_RUNS WATCHDOG_MAIL_HOURS; do
  val=$(sudo -n sed -n "s/^$v=//p" "$ENVF" 2>/dev/null | tail -1 | tr -d "\"' \r")
  case "$val" in "") say "$v: not set in .env.production (the script default applies)";; *[!0-9]*) say "$v: set to a non-number (ignored by the script's arithmetic: check it)";; *) say "$v: set in .env.production to $val (this overrides the script default)";; esac
done

# 3 state
if sudo -n test -d "$ST"; then
  say "monitor critical streaks (key = consecutive runs seen): $(sudo -n cat "$ST/crit-streaks" 2>/dev/null | awk 'NF==2 {printf "%s=%s ", $1, $2}')"
  say "monitor clean-run streak: $(sudo -n cat "$ST/clean-streak" 2>/dev/null || echo n/a)"
  ls_sig=$(sudo -n cat "$ST/last-signature" 2>/dev/null); ls_at=$(sudo -n cat "$ST/last-sent" 2>/dev/null || echo 0)
  say "keys named by the last alert mail: ${ls_sig:-none}; last mail $(( (NOW - ${ls_at:-0}) / 60 )) min ago"
else say "monitor state dir $ST does not exist yet (the monitor has not run with state)"; fi

# 4 mails
ML="$LOGD/nabdah-monitor.log"; AL="$LOGD/nabdah-alerts.log"
if sudo -n test -r "$ML"; then
  say "mails sent per day, last 7 days (needs the new monitor.sh to have run): $(sudo -n grep -o '^\[[0-9-]* [0-9:]*\] mail sent' "$ML" 2>/dev/null | awk '{gsub(/\[/, "", $1); c[$1]++} END {for (d in c) print d, c[d]}' | sort | tail -7 | awk '{printf "%s=%s ", $1, $2}')"
  say "last 5 mail subjects (first 60 characters): $(sudo -n grep 'mail sent' "$ML" 2>/dev/null | tail -5 | sed -E 's/^\[[^]]*\] mail sent( via [a-z]+)?: //' | cut -c1-60 | tr '\n' '|')"
else say "monitor log $ML is not readable"; fi
say "mail failure lines in the alert log (the whole file; it is rotated): $(sudo -n grep -c 'alert mail failed\|alert mail not sent' "$AL" 2>/dev/null || echo 0)"

# 5 watchdog
if sudo -n test -d "$WST"; then
  for f in $(sudo -n ls "$WST" 2>/dev/null | grep '\.lastmail$'); do
    c=${f%.lastmail}; t=$(sudo -n cat "$WST/$f" 2>/dev/null || echo 0)
    say "watchdog $c: last mail $(( (NOW - t) / 60 )) min ago; restarts since it: $(sudo -n cat "$WST/$c.restarts-since-mail" 2>/dev/null || echo 0); failed restarts since it: $(sudo -n cat "$WST/$c.fails-since-mail" 2>/dev/null || echo 0)"
  done
else say "watchdog state dir $WST does not exist yet"; fi
say "done (read-only)"
