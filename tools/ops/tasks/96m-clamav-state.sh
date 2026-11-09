#!/bin/bash
# Is uploaded-file scanning working right now, and what would it take to run on this host? READ-ONLY, one run, `status:` lines only; nothing is started, stopped, written or changed.
# Run 109 deployed with `clamav=SKIPPED_LOW_MEMORY ... uploads_refused_until_scanner_runs` (MemAvailable about 1.1 GB; clamd needs about 1.2-1.5 GB for its signatures).
#   1 container   does the ClamAV container exist, is it running, its memory use and limit, its restart count
#   2 mode        UPLOAD_SCAN in the backend (required | defer | optional | unset: the word only), CLAMAV_ON_DEMAND (0|1|unset)
#   3 memory      host MemAvailable and swap now, and the memory the other containers use (the candidates to pause during a scan window)
#   4 queue       how many stored files wait for a scan (pending_scan / scanning), counted only
#   5 window      what the on-demand window script (deploy/scripts/clamav-window.sh) would need: CLAMAV_MIN_FREE_MB (default 1700) against MemAvailable, and CLAMAV_PAUSE (names only)
# Never prints environment values other than those words and numbers; never the scanner's address.
set -u
DK="sudo -n docker"
CTR=${CLAMAV_CONTAINER:-nabdah-clamav}
BE=${OPS_BACKEND_CONTAINER:-nabdah-backend}
MG=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
say() { echo "status: clamav-state: $*"; }
echo "## clamav-state (read-only)"
benv() { $DK exec "$BE" printenv "$1" 2>/dev/null < /dev/null | head -1; }

# 1 container
if $DK inspect "$CTR" >/dev/null 2>&1; then
  say "container: $($DK inspect -f 'running={{.State.Running}} status={{.State.Status}} restarts={{.RestartCount}} limit_mb={{div .HostConfig.Memory 1048576}} started={{.State.StartedAt}}' "$CTR" 2>/dev/null | cut -c1-200)"
  say "container: memory now $($DK stats --no-stream --format '{{.MemUsage}}' "$CTR" 2>/dev/null | cut -c1-60)"
else
  say "container: $CTR does not exist on this host"
fi

# 2 mode
MODE=$(benv UPLOAD_SCAN); case "$MODE" in required|defer|optional) ;; "") MODE=unset;; *) MODE=set;; esac
OD=$(benv CLAMAV_ON_DEMAND); case "$OD" in 0|1) ;; "") OD=unset;; *) OD=set;; esac
say "mode: UPLOAD_SCAN=$MODE CLAMAV_ON_DEMAND=$OD (defer: an upload is kept in quarantine and never served until scanned; required with no scanner: uploads are refused)"

# 3 memory
AVAIL=$(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo)
say "memory: host MemAvailable ${AVAIL} MB, swap free $(awk '/^SwapFree:/ {print int($2/1024)}' /proc/meminfo) of $(awk '/^SwapTotal:/ {print int($2/1024)}' /proc/meminfo) MB"
say "memory: containers now: $($DK stats --no-stream --format '{{.Name}}={{.MemUsage}}' 2>/dev/null | sed 's/ \/ [0-9.]*[A-Za-z]*//' | tr '\n' ' ' | cut -c1-500)"

# 4 queue
PEND=$($DK exec "$MG" sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "const d=db.getSiblingDB(process.env.MONGO_INITDB_DATABASE||\"nabd_nestjs\"); const q={scan_status:{\$in:[\"pending_scan\",\"scanning\"]}}; print(d.storage_objects.countDocuments(q)+d.media_assets.countDocuments(q))"' 2>/dev/null < /dev/null | tail -1 | grep -E '^[0-9]+$' || echo unknown)
say "queue: files waiting for a scan: $PEND"

# 5 window
MINFREE=1700
if [ "$AVAIL" -ge "$MINFREE" ]; then say "window: MemAvailable ${AVAIL} MB is at least CLAMAV_MIN_FREE_MB ${MINFREE}: a scan window can start without pausing anything"
else say "window: MemAvailable ${AVAIL} MB is $((MINFREE - AVAIL)) MB short of CLAMAV_MIN_FREE_MB ${MINFREE}: a window needs that much to be paused or freed (the PAUSE list is empty by default, so nothing is paused today)"; fi
say "window: CLAMAV_PAUSE is $([ -n "$(benv CLAMAV_PAUSE)" ] && echo set || echo not-set-in-the-backend-env)"
say "done (read-only)"
