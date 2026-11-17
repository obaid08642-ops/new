#!/bin/bash
# R11 P3 step B (docs/platform/R11-halala-p3-plan.md): fill the integer shadow `<field>_halalas` next to the legacy doubles. The ONLY ops task that writes money data. ONE collection per run.
# Owner decision 2026-11-17: P3 approved; every server step goes through an ops run the owner approves, so every write variable below is EMPTY in the repo and is set in this file by the reviewer for one run.
#   Run 1 (everything empty): DRY RUN, read-only. Checks the gates and prints the PLAN as counts (collection, field, to_fill, unclean); no id and no value is printed. Compare `to_fill` with the
#                             96i `missing_shadow` figures: they must be equal, else stop.
#   APPLY=yes COLLECTION=<name> CONFIRM=<same name>: backfills that ONE collection (`--include-ledger` only when INCLUDE_LEDGER=yes, which the owner must have agreed for platformledgerentries).
#                             Prints `RUN_ID <uuid>` and the written / skipped counts. Writes only the missing shadows; never changes or removes a double; a re-run changes nothing.
#   ROLLBACK_RUN=<run id> [APPLY=yes CONFIRM=<same run id>]: undoes exactly that run (the shadows it wrote, only while the double is still there). Dry run unless APPLY=yes.
# Gates (APPLY refuses, a dry run only reports): the backend container is running and below MAX_BACKEND_MEM_PERCENT (default 80) of its memory; the newest nightly dump is from today (UTC), after 03:00,
# and not tiny (MIN_DUMP_MB, default 50); the time is outside 03:00-05:00 UTC (the backup window). The node process is capped at 160 MB and 20 minutes.
set -u
APPLY=""
COLLECTION=""
CONFIRM=""
INCLUDE_LEDGER=""
ROLLBACK_RUN=""
DK="sudo -n docker"
CT=${OPS_BACKEND_CONTAINER:-nabdah-backend}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
MAXPCT=${MAX_BACKEND_MEM_PERCENT:-80}
MIN_DUMP_MB=${MIN_DUMP_MB:-50}
NOW_H=${OPS_NOW_HOUR_UTC:-$(date -u +%H)}
TODAY=${OPS_TODAY_UTC:-$(date -u +%F)}
say() { echo "status: halala-backfill: $*"; }
echo "## halala-backfill"
sanitize() { sed -E 's#(mongodb(\+srv)?://)[^@/ ]*@#\1<hidden>@#g' | cut -c1-240; }

mode=dry; [ "$APPLY" = yes ] && mode=APPLY
[ -n "$ROLLBACK_RUN" ] && mode="rollback-$mode"
say "mode: $mode${COLLECTION:+ collection=$COLLECTION}${ROLLBACK_RUN:+ run=$ROLLBACK_RUN}"

problems=0
refuse() { say "GATE: $*"; problems=$((problems + 1)); }

state=$($DK inspect -f '{{.State.Status}}' "$CT" 2>/dev/null)
if [ "$state" != running ]; then refuse "$CT is not running (state=${state:-unknown})"; else
  pct=$($DK stats --no-stream --format '{{.MemPerc}}' "$CT" 2>/dev/null | tr -d '% ' | cut -d. -f1); pct=${pct:-0}
  say "$CT memory use now: ${pct}% of its limit (limit ${MAXPCT}%)"
  [ "$pct" -gt "$MAXPCT" ] 2>/dev/null && refuse "the backend container is above ${MAXPCT}% of its memory limit"
fi
# backup first: the newest nightly dump is from today (UTC) and not tiny
LAST=$(sudo -n sh -c "ls -t $B/nabd_*.gz $B/nabd_*.gz.gpg 2>/dev/null | head -1")
if [ -z "$LAST" ]; then refuse "no nightly dump found in $B"; else
  DAY=$(sudo -n stat -c %y "$LAST" 2>/dev/null | cut -c1-10); MB=$(( $(sudo -n stat -c %s "$LAST" 2>/dev/null || echo 0) / 1048576 ))
  say "newest dump: ${LAST##*/} dated $DAY, ${MB} MB"
  [ "$DAY" = "$TODAY" ] || refuse "the newest dump is not from today ($TODAY)"
  [ "$MB" -ge "$MIN_DUMP_MB" ] 2>/dev/null || refuse "the newest dump is smaller than ${MIN_DUMP_MB} MB"
fi
case "$NOW_H" in 03|04) refuse "it is ${NOW_H}:xx UTC: the backup window (03:00-05:00) is off limits";; esac

if [ "$APPLY" = yes ]; then
  if [ -n "$ROLLBACK_RUN" ]; then [ "$CONFIRM" = "$ROLLBACK_RUN" ] || refuse "CONFIRM must equal ROLLBACK_RUN for a rollback"
  else
    [ -n "$COLLECTION" ] || refuse "APPLY needs ONE COLLECTION (one collection per run)"
    case "$COLLECTION" in *,*) refuse "one collection per run: COLLECTION must not be a list";; esac
    [ "$CONFIRM" = "$COLLECTION" ] || refuse "CONFIRM must equal COLLECTION"
  fi
  if [ "$problems" -gt 0 ]; then say "REFUSE: $problems gate(s) failed; nothing was written"; exit 0; fi
elif [ "$problems" -gt 0 ]; then say "dry run: $problems gate(s) would refuse an APPLY now (reported only)"; fi
[ "$state" = running ] || { say "nothing run"; exit 0; }

args=()
if [ -n "$ROLLBACK_RUN" ]; then args+=("--rollback=$ROLLBACK_RUN")
else
  [ -n "$COLLECTION" ] && args+=("--collection=$COLLECTION")
  [ "$INCLUDE_LEDGER" = yes ] && args+=("--include-ledger")
fi
[ "$APPLY" = yes ] && args+=("--apply")

# the container's own DB_NAME is the confirm word the CLI wants for a write; the owner's gate is the variables above
DBCONFIRM=""
[ "$APPLY" = yes ] && DBCONFIRM=$($DK exec "$CT" sh -c 'printf %s "$DB_NAME"' 2>/dev/null < /dev/null)
out=$(timeout 1200 $DK exec -e NODE_OPTIONS=--max-old-space-size=160 ${DBCONFIRM:+-e MONEY_BACKFILL_CONFIRM="$DBCONFIRM"} "$CT" node dist/scripts/money-halala-backfill.js "${args[@]}" 2>&1 < /dev/null); rc=$?
# counts only: the plan's collection / field / to_fill / unclean keys, the run id and the totals; never the unclean sample (ids and values)
printf '%s\n' "$out" | grep -E '^(RUN_ID |APPLIED |ROLLBACK |dry run only|failed:|refusing)|^ *"(collection|field|to_fill|unclean)":' | sanitize | while IFS= read -r l; do say "$(echo "$l" | sed -E 's/^ +//')"; done
if [ "$rc" = 124 ]; then say "TIMEOUT: stopped after 20 minutes (a re-run continues where it stopped; nothing is lost)"; elif [ "$rc" != 0 ]; then say "the script exited with code $rc"; fi
say "done"
