#!/bin/bash
# Ledger duplicate earnings, READ-ONLY: how many (ref_type, ref_id) pairs have more than one provider_earning row (a service credited twice), how many rows are extra, and whether the
# unique index `provider_earning_ref_unique` already exists. Counts only: no document, id, value or secret is printed. Nothing is written and no index is built by this task.
# It uses the compiled CLI inside the backend container (`dist/scripts/ledger-earning-duplicates.js`, which reads MONGO_URL and DB_NAME from the container's own environment), so the
# credentials never leave the container or reach a command line.
# Safe to run next to the live API: the node process is capped at 96 MB of heap and 10 minutes, and the task REFUSES to start when the backend container already uses more than
# MAX_BACKEND_MEM_PERCENT (default 80) of its memory limit. It reads the ledger with one aggregation.
# Gate: the backend builds the unique index itself only when groups=0; with groups>0 it logs a warning and leaves the index out until finance has resolved the duplicates.
set -u
DK="sudo -n docker"
CT=${OPS_BACKEND_CONTAINER:-nabdah-backend}
MAXPCT=${MAX_BACKEND_MEM_PERCENT:-80}
say() { echo "status: ledger-duplicates: $*"; }
echo "## ledger-duplicates (read-only)"

state=$($DK inspect -f '{{.State.Status}}' "$CT" 2>/dev/null)
[ "$state" = running ] || { say "REFUSE: $CT is not running (state=${state:-unknown}); nothing was run"; exit 0; }
pct=$($DK stats --no-stream --format '{{.MemPerc}}' "$CT" 2>/dev/null | tr -d '% ' | cut -d. -f1)
pct=${pct:-0}
say "$CT memory use now: ${pct}% of its limit (refuses above ${MAXPCT}%)"
if [ "$pct" -gt "$MAXPCT" ] 2>/dev/null; then say "REFUSE: the backend container is above ${MAXPCT}% of its memory limit; run this when it is quieter. Nothing was run."; exit 0; fi

out=$(timeout 600 $DK exec -e NODE_OPTIONS=--max-old-space-size=96 "$CT" node dist/scripts/ledger-earning-duplicates.js 2>&1 < /dev/null); rc=$?
# only the counts lines and the one-line failure message are shown, with anything that looks like a connection string masked
printf '%s\n' "$out" | grep -E '^(ledger-duplicates:|failed:)' | sed -E 's#(mongodb(\+srv)?://)[^@/ ]*@#\1<hidden>@#g' | cut -c1-240 | while IFS= read -r l; do
  case "$l" in ledger-duplicates:*) say "${l#ledger-duplicates: }" ;; *) say "ERROR: $l" ;; esac
done
if [ "$rc" = 124 ]; then say "TIMEOUT: stopped after 10 minutes (read-only; nothing to undo)"; elif [ "$rc" != 0 ]; then say "the counting script exited with code $rc"; fi
say "done (read-only; nothing was written)"
