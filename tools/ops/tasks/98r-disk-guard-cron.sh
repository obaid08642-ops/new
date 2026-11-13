#!/bin/bash
# Installs the daily disk guard (deploy/scripts/disk-guard.sh, PR #2627) on the host: nothing installed it after the merge (2026-11-12: disk fell to 13 % free).
# Cron file written here: /etc/cron.d/nabd-disk-guard (05:20 UTC, off-peak). It is a separate file on purpose: /etc/cron.d/nabd-backups is never edited.
#   Run 1 (APPLY empty): DRY RUN. READ-ONLY. Prints whether the script is on the host (and whether it differs from the repo copy), where disk-guard.sh is already scheduled,
#   the free space of / in percent, and the files and the cron line APPLY=yes would write. Changes nothing.
#   APPLY=yes: backs up an existing script / cron file (<name>.bak-<UTC time>), copies the repo's disk-guard.sh to $SCRIPT (0755 root), writes the cron file ONLY when no other place
#   already schedules disk-guard.sh (a second schedule would run it twice). Status lines only: no output of the guard itself is printed.
#   ROLLBACK=yes: removes the cron file written here (the script and the backups stay).
set -u
APPLY="yes"
ROLLBACK=""
HERE=$(cd "$(dirname "$0")" && pwd)
REL_ROOT=${OPS_RELEASE_DIR:-/opt/nabdah/releases}
# the task runs from a plain directory on the host (no repo checkout): the script comes from the NEWEST deployed release (deploy/ of the release = what 91c-host-files copies)
NEWEST=$(ls -1dt "$REL_ROOT"/*/ 2>/dev/null | head -1)
SRC=${OPS_DISK_GUARD_SRC:-${NEWEST%/}/deploy/scripts/disk-guard.sh}
# the release carries the deploy files as deploy.tgz (not unpacked): take the script out of the tarball when it is not already a plain file
if [ ! -f "$SRC" ] && [ -f "${NEWEST%/}/deploy.tgz" ]; then
  TMPSRC=$(mktemp); for m in deploy/scripts/disk-guard.sh scripts/disk-guard.sh ./scripts/disk-guard.sh ./deploy/scripts/disk-guard.sh; do
    if tar -xzOf "${NEWEST%/}/deploy.tgz" "$m" > "$TMPSRC" 2>/dev/null && [ -s "$TMPSRC" ]; then SRC=$TMPSRC; break; fi
  done
fi
CRON_DIR=${OPS_CRON_DIR:-/etc/cron.d}
CRON_FILE=$CRON_DIR/nabd-disk-guard
SCRIPT=${OPS_DISK_GUARD_SCRIPT:-/opt/nabdah/deploy/scripts/disk-guard.sh}
LOG=${OPS_WATCHDOG_LOG:-/var/log/nabd-backups.log}
CRON_LINE="20 5 * * * root $SCRIPT >> $LOG 2>&1"
echo "## disk-guard-cron"
say() { echo "status: disk-guard-cron: $*"; }

if [ "$ROLLBACK" = yes ]; then sudo -n rm -f "$CRON_FILE"; say "rolled back: $CRON_FILE removed"; exit 0; fi

HAVE=no; sudo -n test -x "$SCRIPT" && HAVE=yes
DIFF=n/a
if [ "$HAVE" = yes ] && [ -f "$SRC" ]; then sudo -n cmp -s "$SRC" "$SCRIPT" && DIFF=identical || DIFF=differs; fi
# every place that schedules disk-guard.sh: file names only
OTHER=${OPS_SCHED_PATHS:-"/etc/crontab /var/spool/cron/crontabs/* /var/spool/cron/* /etc/cron.hourly/* /etc/cron.daily/*"}
FOUND=$(sudo -n sh -c "grep -ls 'disk-guard\\.sh' $CRON_DIR/* $OTHER 2>/dev/null" | sed 's#.*/##' | sort -u | tr '\n' ' ')
ROOTTAB=""; sudo -n crontab -l 2>/dev/null | grep -q 'disk-guard\.sh' && ROOTTAB="root-crontab"
SCHED="$FOUND$ROOTTAB"; SCHED=${SCHED% }
FREE=$(df -Pk / 2>/dev/null | awk 'NR==2{ if ($2>0) printf "%d", ($4*100)/$2; else print 0 }')
say "script on the host: $HAVE (vs repo copy: $DIFF); scheduled in: ${SCHED:-NOWHERE}; free space on /: ${FREE:-unknown}%"
if [ "$APPLY" != yes ]; then
  say "dry run only: nothing was changed. APPLY=yes would copy the repo's disk-guard.sh to $SCRIPT and write $CRON_FILE with: $CRON_LINE"; exit 0
fi
[ -f "$SRC" ] || { say "ABORT repo copy $SRC not found: nothing written"; exit 1; }
case " $SCHED " in
  *" nabd-disk-guard "*|"  ") ;;
  *) [ -z "$SCHED" ] || { say "ABORT disk-guard.sh is already scheduled in: $SCHED. A second schedule would run it twice; nothing written"; exit 1; };;
esac
TS=$(date -u +%Y%m%dT%H%M%SZ)
sudo -n mkdir -p "$(dirname "$SCRIPT")" "$CRON_DIR" || { say "ABORT cannot create the target directories"; exit 1; }
if [ "$HAVE" = yes ]; then sudo -n cp -p "$SCRIPT" "$SCRIPT.bak-$TS" || { say "ABORT cannot back up $SCRIPT"; exit 1; }; say "backed up the old script to $SCRIPT.bak-$TS"; fi
if sudo -n test -f "$CRON_FILE"; then sudo -n cp -p "$CRON_FILE" "$CRON_FILE.bak-$TS" || { say "ABORT cannot back up $CRON_FILE"; exit 1; }; say "backed up the old cron file to $CRON_FILE.bak-$TS"; fi
sudo -n cp "$SRC" "$SCRIPT" || { say "ABORT cannot write $SCRIPT"; exit 1; }
sudo -n chmod 755 "$SCRIPT"
printf '%s\n' "# written by tools/ops/tasks/98r-disk-guard-cron.sh" "$CRON_LINE" | sudo -n tee "$CRON_FILE" >/dev/null || { say "ABORT cannot write $CRON_FILE"; exit 1; }
sudo -n chmod 644 "$CRON_FILE"
say "installed $SCRIPT and $CRON_FILE (daily 05:20 UTC; acts only below 25 % free, never touches backups, volumes or uploads)"
