#!/bin/bash
# R11 (money integrity) gate numbers, READ-ONLY: per collection.field, how many amounts are doubles, how many lack the integer shadow `<field>_halalas` (split clean / unclean), and
# how many shadows DISAGREE with their double (> 0 halalas, or not a number). Counts only: no document, id, value or secret is printed. Nothing is written (the writer is a different
# script, money-halala-backfill.js, which this task never runs). It uses the compiled CLI inside the backend container (`dist/scripts/money-halala-counts.js`, which reads MONGO_URL and
# DB_NAME from the container's own environment), so the credentials never leave the container or reach a command line.
# Safe to run next to the live API: the node process is capped at 96 MB of heap and 10 minutes, and the task REFUSES to start when the backend container already uses more than
# MAX_BACKEND_MEM_PERCENT (default 80) of its memory limit (the backend limit is 576m; the extra process needs about 100 MB). It reads each collection once with a streaming cursor.
# Gate (docs/platform/R11-money-integrity.md): before P2/P3, TOTAL unclean must be 0 (or each unclean row resolved by finance) and shadow_disagree must be 0.
set -u
DK="sudo -n docker"
CT=${OPS_BACKEND_CONTAINER:-nabdah-backend}
MAXPCT=${MAX_BACKEND_MEM_PERCENT:-80}
say() { echo "status: halala-counts: $*"; }
echo "## halala-counts (read-only)"

state=$($DK inspect -f '{{.State.Status}}' "$CT" 2>/dev/null)
[ "$state" = running ] || { say "REFUSE: $CT is not running (state=${state:-unknown}); nothing was run"; exit 0; }
pct=$($DK stats --no-stream --format '{{.MemPerc}}' "$CT" 2>/dev/null | tr -d '% ' | cut -d. -f1)
pct=${pct:-0}
say "$CT memory use now: ${pct}% of its limit (refuses above ${MAXPCT}%)"
if [ "$pct" -gt "$MAXPCT" ] 2>/dev/null; then say "REFUSE: the backend container is above ${MAXPCT}% of its memory limit; run this when it is quieter. Nothing was run."; exit 0; fi

out=$(timeout 600 $DK exec -e NODE_OPTIONS=--max-old-space-size=96 "$CT" node dist/scripts/money-halala-counts.js 2>&1 < /dev/null); rc=$?
# only the counts lines and the one-line failure message are shown, with anything that looks like a connection string masked
printf '%s\n' "$out" | grep -E '^(halala-counts:|failed:)' | sed -E 's#(mongodb(\+srv)?://)[^@/ ]*@#\1<hidden>@#g' | cut -c1-240 | while IFS= read -r l; do
  case "$l" in halala-counts:*) say "${l#halala-counts: }" ;; *) say "ERROR: $l" ;; esac
done
if [ "$rc" = 124 ]; then say "TIMEOUT: stopped after 10 minutes (read-only; nothing to undo)"; elif [ "$rc" != 0 ]; then say "the counting script exited with code $rc"; fi
say "done (read-only; nothing was written)"
