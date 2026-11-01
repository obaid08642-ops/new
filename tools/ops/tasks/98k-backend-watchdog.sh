#!/bin/bash
# Installs the host watchdog cron (2026-11-01 outage: nabdah-backend stayed "unhealthy" for ~2 h after mongod restarted; Docker never restarts an unhealthy container).
# Needs deploy/scripts/backend-watchdog.sh on the host first: run 91c-host-files (it installs the script under /opt/nabdah/deploy/scripts).
#   Run 1 (APPLY empty): DRY RUN. Prints whether the script and the cron are present and the line it would install. Changes nothing.
#   Run 2 (APPLY=yes): writes the cron file $CRON_FILE: every minute, WATCHDOG_APPLY=yes (restarts for real, once per 15 min per container, after 3 unhealthy minutes).
#   ROLLBACK=yes: removes the cron file (the script and its state directory stay).
set -u
APPLY=""
ROLLBACK=""
CRON_DIR=${OPS_CRON_DIR:-/etc/cron.d}
CRON_FILE=$CRON_DIR/nabd-backend-watchdog
SCRIPT=${OPS_WATCHDOG_SCRIPT:-/opt/nabdah/deploy/scripts/backend-watchdog.sh}
LOG=${OPS_WATCHDOG_LOG:-/var/log/nabd-backups.log}
CRON_LINE="* * * * * root WATCHDOG_APPLY=yes $SCRIPT >> $LOG 2>&1"
echo "## backend-watchdog"
say() { echo "status: backend-watchdog: $*"; }

if [ "$ROLLBACK" = yes ]; then sudo -n rm -f "$CRON_FILE"; say "rolled back: cron file removed"; exit 0; fi
HAVE=no; sudo -n test -x "$SCRIPT" && HAVE=yes
INSTALLED=no; sudo -n test -f "$CRON_FILE" && INSTALLED=yes
say "script present: $HAVE; cron installed: $INSTALLED"
if [ "$APPLY" != yes ]; then say "dry run only: nothing was installed. Would install: $CRON_LINE"; exit 0; fi
[ "$HAVE" = yes ] || { say "ABORT $SCRIPT is missing or not executable: run 91c-host-files first"; exit 1; }
sudo -n mkdir -p "$CRON_DIR" || { say "ABORT cannot create $CRON_DIR"; exit 1; }
printf '%s\n' "# written by tools/ops/tasks/98k-backend-watchdog.sh" "$CRON_LINE" | sudo -n tee "$CRON_FILE" >/dev/null || { say "ABORT cannot write $CRON_FILE"; exit 1; }
sudo -n chmod 644 "$CRON_FILE"
say "installed $CRON_FILE (every minute; restarts nabdah-backend / nabdah-patient-web after 3 unhealthy minutes, once per 15 min)"
