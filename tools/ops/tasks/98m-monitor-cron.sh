#!/bin/bash
# Is deploy/scripts/monitor.sh (disk, containers, backups; mails OPS_ALERT_EMAIL) really scheduled, and do its mails go out? (2026-11-01 outage: nobody was alerted; run 79 found
# the alert log with entries up to 05:00 although 99n saw no cron line: 99n's cron search expanded /var/spool/cron/crontabs/* in the caller's shell, which cannot read that directory.)
#   Dry run (default): READ-ONLY. Prints every place that names monitor.sh (cron.d files, /etc/crontab, root's crontab via `crontab -l`, systemd timers), the script on the host,
#   the age of the last line in the alert log and of the last-sent state, and whether the mail settings are set (set/unset only).
#   TESTMAIL=yes: sends ONE test mail through the real provider path (monitor.sh MONITOR_TEST_MAIL=1) and prints only "sent" or "failed". Changes nothing else.
#   APPLY=yes: writes /etc/cron.d/nabd-monitor (every 15 minutes) ONLY when no other place already schedules monitor.sh (a second schedule would double every mail). Needs the script on the
#   host first (91c-host-files). ROLLBACK=yes removes the cron file written here.
set -u
APPLY="yes"
TESTMAIL=""
ROLLBACK=""
CRON_DIR=${OPS_CRON_DIR:-/etc/cron.d}
CRON_FILE=$CRON_DIR/nabd-monitor
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
SCRIPT=$D/scripts/monitor.sh
LOGF=${OPS_ALERT_LOG:-/var/log/nabdah-alerts.log}
STATE=${OPS_MONITOR_STATE:-/var/lib/nabdah-monitor}
BACKLOG=${OPS_WATCHDOG_LOG:-/var/log/nabd-backups.log}
CRON_LINE="*/15 * * * * root $SCRIPT >> $BACKLOG 2>&1"
echo "## monitor-cron"
say() { echo "status: monitor-cron: $*"; }

if [ "$ROLLBACK" = yes ]; then sudo -n rm -f "$CRON_FILE"; say "rolled back: $CRON_FILE removed"; exit 0; fi

# every place that schedules monitor.sh: file names only (never a line, a mail address or a key)
OTHER=${OPS_SCHED_PATHS:-"/etc/crontab /var/spool/cron/crontabs/* /var/spool/cron/* /etc/cron.hourly/* /etc/cron.daily/* /etc/systemd/system/*.service /etc/systemd/system/*.timer"}
FOUND=$(sudo -n sh -c "grep -ls 'monitor\\.sh' $CRON_DIR/* $OTHER 2>/dev/null" | sed 's#.*/##' | sort -u | tr '\n' ' ')
ROOTTAB=""; sudo -n crontab -l 2>/dev/null | grep -q 'monitor\.sh' && ROOTTAB="root-crontab"
SCHED="$FOUND$ROOTTAB"; SCHED=${SCHED% }
HAVE=no; sudo -n test -x "$SCRIPT" && HAVE=yes
say "monitor.sh scheduled in: ${SCHED:-NOWHERE}; script on the host: $HAVE"
age() { local m; m=$(sudo -n stat -c %Y "$1" 2>/dev/null) || { echo "missing"; return; }; echo "$(( ($(date +%s) - m) / 60 )) min ago"; }
say "alert log last written: $(age "$LOGF"); last mail sent state: $(age "$STATE/last-sent"); last signature: $(age "$STATE/last-signature"); last daily summary: $(age "$STATE/last-summary")"
ENVF=$D/.env.production
setp() { sudo -n sh -c "grep -qE '^$1=.+' '$ENVF'" 2>/dev/null && echo set || echo unset; }
say "mail settings: OPS_ALERT_EMAIL=$(setp OPS_ALERT_EMAIL) MAIL_FROM=$(setp MAIL_FROM) RESEND_API_KEY=$(setp RESEND_API_KEY) BREVO_API_KEY=$(setp BREVO_API_KEY) MAILJET_API_KEY=$(setp MAILJET_API_KEY)"

if [ "$TESTMAIL" = yes ]; then
  [ "$HAVE" = yes ] || { say "ABORT $SCRIPT is missing: run 91c-host-files first"; exit 1; }
  R=$(sudo -n env MONITOR_TEST_MAIL=1 bash "$SCRIPT" 2>&1 | grep '^status: monitor-testmail:' | tail -1)
  say "test mail: ${R:-failed (monitor.sh printed no result)}" | sed 's/status: monitor-cron: test mail: status: monitor-testmail: /status: monitor-cron: test mail: /'
  exit 0
fi
if [ "$APPLY" != yes ]; then
  say "dry run only: nothing was changed. Test the mail with TESTMAIL=yes. To schedule it (only if NOWHERE above): APPLY=yes would write: $CRON_LINE"; exit 0
fi
[ "$HAVE" = yes ] || { say "ABORT $SCRIPT is missing or not executable: run 91c-host-files first"; exit 1; }
case " $SCHED " in *" nabd-monitor "*) say "already installed by this task: nothing to do"; exit 0;; esac
[ -z "$SCHED" ] || { say "ABORT monitor.sh is already scheduled in: $SCHED. A second schedule would send every mail twice; nothing written"; exit 1; }
sudo -n mkdir -p "$CRON_DIR" || { say "ABORT cannot create $CRON_DIR"; exit 1; }
printf '%s\n' "# written by tools/ops/tasks/98m-monitor-cron.sh" "$CRON_LINE" | sudo -n tee "$CRON_FILE" >/dev/null || { say "ABORT cannot write $CRON_FILE"; exit 1; }
sudo -n chmod 644 "$CRON_FILE"
say "installed $CRON_FILE (every 15 minutes). Run TESTMAIL=yes next to prove the mail path"
