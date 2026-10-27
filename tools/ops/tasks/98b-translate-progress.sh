#!/bin/bash
# READ-ONLY progress of a detached 98-translate-content run (run 38 outlived the workflow's 120-min poll).
# Prints counts only: is the task still running, how many answers the container and the host hold, and the task's own status: lines.
# Sends nothing to a model and writes nothing.
set -u
CT=${CATALOGUE_CONTAINER:-nabdah-backend}
IN=${OPS_CATALOGUE_DIR:-/opt/nabdah/catalogue}
W=${OPS_TRANSLATE_DIR:-$IN/translate-work}
DK="sudo -n docker"
say() { echo "status: translate-progress: $*"; }
LOG="$HOME/ops-98-translate-content.log"
if [ -f "$LOG" ]; then
  if grep -q '^ops-exit=' "$LOG"; then say "task finished: $(grep -m1 '^ops-exit=' "$LOG")"; else say "task still running"; fi
  grep -E '^status: translate-content' "$LOG" | tail -n 6 | cut -c1-500 | sed 's/^status: /status: translate-progress: log: /'
else
  say "no detached log found"
fi
REQ_C=$($DK exec "$CT" sh -c 'wc -l < /tmp/translate-work/requests.jsonl' 2>/dev/null || echo none)
RES_C=$($DK exec "$CT" sh -c 'wc -l < /tmp/translate-work/responses.jsonl' 2>/dev/null || echo none)
REQ_H=$(sudo -n sh -c "wc -l < '$W/requests.jsonl'" 2>/dev/null || echo none)
RES_H=$(sudo -n sh -c "wc -l < '$W/responses.jsonl'" 2>/dev/null || echo none)
say "container: requests=$REQ_C answers=$RES_C | host: requests=$REQ_H answers=$RES_H"
exit 0
