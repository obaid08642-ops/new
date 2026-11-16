#!/bin/bash
# Catalogue active-ingredient normalization (issue #1556): DRY RUN, READ-ONLY. Counts per status (empty / leaflet / confident / review), per category, how many strengths are readable, and the most
# frequent normalized spellings (the candidates for the owner's INN table). Product ids and names are never printed; nothing is written (the script has no write call and no --apply; the migration
# that writes is a later, separate script that waits for the owner's approval of the table). Same safety as 96i: the compiled script runs INSIDE the backend container (it reads MONGO_URL and DB_NAME from the
# container's own environment, so no credential reaches a command line), the node process is capped at 160 MB of heap and 10 minutes, and the task REFUSES to start when the backend container is already above
# MAX_BACKEND_MEM_PERCENT (default 80) of its limit. Optional: TOP=<n> spellings (default 60).
set -u
DK="sudo -n docker"
CT=${OPS_BACKEND_CONTAINER:-nabdah-backend}
MAXPCT=${MAX_BACKEND_MEM_PERCENT:-80}
TOP=${TOP:-60}
case "$TOP" in ''|*[!0-9]*) TOP=60;; esac
say() { echo "status: ingredient-dry-run: $*"; }
echo "## ingredient-dry-run (read-only)"

state=$($DK inspect -f '{{.State.Status}}' "$CT" 2>/dev/null)
[ "$state" = running ] || { say "REFUSE: $CT is not running (state=${state:-unknown}); nothing was run"; exit 0; }
pct=$($DK stats --no-stream --format '{{.MemPerc}}' "$CT" 2>/dev/null | tr -d '% ' | cut -d. -f1)
pct=${pct:-0}
say "$CT memory use now: ${pct}% of its limit (refuses above ${MAXPCT}%)"
if [ "$pct" -gt "$MAXPCT" ] 2>/dev/null; then say "REFUSE: the backend container is above ${MAXPCT}% of its memory limit; run this when it is quieter. Nothing was run."; exit 0; fi

out=$(timeout 600 $DK exec -e NODE_OPTIONS=--max-old-space-size=160 -e TOP="$TOP" "$CT" node dist/scripts/ingredient-dry-run.js 2>&1 < /dev/null); rc=$?
# only the report lines and the one-line failure message are shown, with anything that looks like a connection string masked
printf '%s\n' "$out" | grep -E '^(ingredient-dry-run:|failed:)' | sed -E 's#(mongodb(\+srv)?://)[^@/ ]*@#\1<hidden>@#g' | cut -c1-240 | while IFS= read -r l; do
  case "$l" in ingredient-dry-run:*) say "${l#ingredient-dry-run: }" ;; *) say "ERROR: $l" ;; esac
done
if [ "$rc" = 124 ]; then say "TIMEOUT: stopped after 10 minutes (read-only; nothing to undo)"; elif [ "$rc" != 0 ]; then say "the dry-run script exited with code $rc"; fi
say "done (read-only; nothing was written)"
