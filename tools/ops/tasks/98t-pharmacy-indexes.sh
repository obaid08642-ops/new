#!/bin/bash
# Migration 20260827 indexes (run 96u, 2026-11-17: 4 MISSING: domain_outbox_pharmacy_idempotency_unique, pharmacy_broadcast_recipient_unique, pharmacy_offers_due_expiry_scan, pharmacy_broadcasts_due_expiry_scan).
# The two UNIQUE ones are what the pharmacy code relies on (an insert that hits E11000 means "already done"), so they must exist before launch. The production image has no `scripts/` folder, so this
# runs the COMPILED CLI inside the backend container (`dist/scripts/pharmacy-expiry-indexes.js`; it reads MONGO_URL and DB_NAME from the container's own environment: no credential on a command line).
#   Run 1 (everything empty): DRY RUN, read-only. Per index: present / missing, rows, and for the unique ones the number of DUPLICATE key groups (must be 0). Counts only, no id, no value.
#   APPLY=yes CONFIRM=indexes: creates the missing indexes whose pre-flight is clean. A unique index with duplicates is REFUSED (counts reported): nothing is deleted or merged by this task; the duplicates
#   are resolved by a person first. Writes nothing but the indexes. A re-run changes nothing. Mongo builds them in the background; the collections are small (rows are printed by the dry run).
# Gates (APPLY refuses, a dry run only reports): the backend container is running and below MAX_BACKEND_MEM_PERCENT (default 80) of its memory; not 03:00-05:00 UTC (the backup window).
set -u
APPLY=""
CONFIRM=""
DK="sudo -n docker"
CT=${OPS_BACKEND_CONTAINER:-nabdah-backend}
MAXPCT=${MAX_BACKEND_MEM_PERCENT:-80}
NOW_H=${OPS_NOW_HOUR_UTC:-$(date -u +%H)}
say() { echo "status: pharmacy-indexes: $*"; }
echo "## pharmacy-indexes"

problems=0
refuse() { say "GATE: $*"; problems=$((problems + 1)); }
state=$($DK inspect -f '{{.State.Status}}' "$CT" 2>/dev/null)
if [ "$state" != running ]; then refuse "$CT is not running (state=${state:-unknown})"; else
  pct=$($DK stats --no-stream --format '{{.MemPerc}}' "$CT" 2>/dev/null | tr -d '% ' | cut -d. -f1); pct=${pct:-0}
  say "$CT memory use now: ${pct}% of its limit (limit ${MAXPCT}%)"
  [ "$pct" -gt "$MAXPCT" ] 2>/dev/null && refuse "the backend container is above ${MAXPCT}% of its memory limit"
fi
case "$NOW_H" in 03|04) refuse "it is ${NOW_H}:xx UTC: the backup window (03:00-05:00) is off limits";; esac
if [ "$APPLY" = yes ]; then
  [ "$CONFIRM" = indexes ] || refuse "CONFIRM must be the word: indexes"
  if [ "$problems" -gt 0 ]; then say "REFUSE: $problems gate(s) failed; nothing was written"; exit 0; fi
elif [ "$problems" -gt 0 ]; then say "dry run: $problems gate(s) would refuse an APPLY now (reported only)"; fi
[ "$state" = running ] || { say "nothing run"; exit 0; }

args=(); DBCONFIRM=""
if [ "$APPLY" = yes ]; then
  args+=("--apply")
  DBCONFIRM=$($DK exec "$CT" sh -c 'printf %s "$DB_NAME"' 2>/dev/null < /dev/null)
fi
out=$(timeout 900 $DK exec -e NODE_OPTIONS=--max-old-space-size=160 ${DBCONFIRM:+-e PHARMACY_INDEXES_CONFIRM="$DBCONFIRM"} "$CT" node dist/scripts/pharmacy-expiry-indexes.js "${args[@]}" 2>&1 < /dev/null); rc=$?
printf '%s\n' "$out" | grep -E '^(pharmacy-indexes:|failed:|refusing)' | sed -E 's#(mongodb(\+srv)?://)[^@/ ]*@#\1<hidden>@#g' | cut -c1-240 | while IFS= read -r l; do say "${l#pharmacy-indexes: }"; done
if [ "$rc" = 124 ]; then say "TIMEOUT: stopped after 15 minutes (a re-run continues; nothing is lost)"; elif [ "$rc" != 0 ]; then say "the script exited with code $rc"; fi
say "done"
