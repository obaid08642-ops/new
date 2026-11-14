#!/bin/bash
# Cloudinary orphans (lead 2026-11-12: Cloudinary is over its plan, the owner pays nothing new), READ-ONLY dry run: how many assets under nabd/ no live storage row points to, how many
# megabytes, and per folder (no asset id, account id or URL is printed; only counts and MB). It never deletes: the compiled CLI is run WITHOUT --apply. The owner approves the numbers first;
# deleting is a separate, explicit run of `dist/scripts/cloudinary-orphans.js --apply` with CLOUDINARY_ORPHAN_CONFIRM=<cloud name> (see the script header), never part of this task.
# It uses the compiled CLI inside the backend container, which reads MONGO_URL, DB_NAME and the CLOUDINARY_* values from the container's own environment, so no credential reaches a command line.
# Safe next to the live API: heap capped at 96 MB, 10 minutes, and the task REFUSES to start when the backend container already uses more than MAX_BACKEND_MEM_PERCENT (default 80) of its memory limit.
set -u
DK="sudo -n docker"
CT=${OPS_BACKEND_CONTAINER:-nabdah-backend}
MAXPCT=${MAX_BACKEND_MEM_PERCENT:-80}
say() { echo "status: cloudinary-orphans: $*"; }
echo "## cloudinary-orphans (read-only)"

state=$($DK inspect -f '{{.State.Status}}' "$CT" 2>/dev/null)
[ "$state" = running ] || { say "REFUSE: $CT is not running (state=${state:-unknown}); nothing was run"; exit 0; }
pct=$($DK stats --no-stream --format '{{.MemPerc}}' "$CT" 2>/dev/null | tr -d '% ' | cut -d. -f1)
pct=${pct:-0}
say "$CT memory use now: ${pct}% of its limit (refuses above ${MAXPCT}%)"
if [ "$pct" -gt "$MAXPCT" ] 2>/dev/null; then say "REFUSE: the backend container is above ${MAXPCT}% of its memory limit; run this when it is quieter. Nothing was run."; exit 0; fi

out=$(timeout 600 $DK exec -e NODE_OPTIONS=--max-old-space-size=96 "$CT" node dist/scripts/cloudinary-orphans.js 2>&1 < /dev/null); rc=$?
# only the counts lines and the one-line failure message are shown, with anything that looks like a connection string masked
printf '%s\n' "$out" | grep -E '^(cloudinary-orphans:|failed:)' | sed -E 's#(mongodb(\+srv)?://)[^@/ ]*@#\1<hidden>@#g' | cut -c1-240 | while IFS= read -r l; do
  case "$l" in cloudinary-orphans:*) say "${l#cloudinary-orphans: }" ;; *) say "ERROR: $l" ;; esac
done
if [ "$rc" = 124 ]; then say "TIMEOUT: stopped after 10 minutes (read-only; nothing to undo)"; elif [ "$rc" != 0 ]; then say "the counting script exited with code $rc"; fi
say "done (read-only; nothing was written)"
