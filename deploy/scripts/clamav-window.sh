#!/bin/bash
# ═══ ClamAV on demand for a small server ═══
# clamd keeps its whole signature database in RAM (about 1.2-1.5 GB), more than a 1.3 GB-free server can spare all day. With UPLOAD_SCAN=defer
# (backend/src/modules/storage/clamav.service.ts) an upload that finds no scanner is accepted into quarantine (`pending/`, never served);
# this script gives the scanner a window to work: it starts the ClamAV container when files are waiting and the memory is there, and stops it
# again once the queue has been empty for CLAMAV_IDLE_STOP_MIN minutes, so the memory comes back. The backend's scan worker (60 s) does the scanning.
# Off unless CLAMAV_ON_DEMAND=1 (set it in deploy/.env.production together with UPLOAD_SCAN=defer). A file is never released by this script.
# Schedule: every 2 minutes (deploy/cron/nabd-backups). Settings: CLAMAV_CONTAINER (nabdah-clamav), CLAMAV_MIN_FREE_MB (1700),
# CLAMAV_IDLE_STOP_MIN (10), CLAMAV_STATE_DIR. Test hooks: CLAMAV_PENDING_COUNT (replaces the database query), CLAMAV_MEMINFO, CLAMAV_NOW_EPOCH.
set -uo pipefail
source "$(dirname "$0")/_backup-common.sh"
nabd_load_env
[ "${CLAMAV_ON_DEMAND:-0}" = 1 ] || exit 0

CTR=${CLAMAV_CONTAINER:-nabdah-clamav}
MONGO_CONTAINER=${MONGO_CONTAINER:-nabdah-mongodb}
MIN_FREE_MB=${CLAMAV_MIN_FREE_MB:-1700}
IDLE_STOP_MIN=${CLAMAV_IDLE_STOP_MIN:-10}
STATE_DIR=${CLAMAV_STATE_DIR:-/var/tmp/nabd-clamav-window}
MEMINFO=${CLAMAV_MEMINFO:-/proc/meminfo}
NOW=${CLAMAV_NOW_EPOCH:-$(date +%s)}
D=${DEPLOY_DIR:-/opt/nabdah/deploy}
mkdir -p "$STATE_DIR"
IDLE_FILE="$STATE_DIR/idle_since"
log() { echo "[$(date -u +%FT%TZ)] clamav-window: $*"; }

pending_count() {
  if [ -n "${CLAMAV_PENDING_COUNT:-}" ]; then echo "$CLAMAV_PENDING_COUNT"; return; fi
  local args=() a
  while IFS= read -r a; do args+=("$a"); done < <(mongo_auth)
  docker exec "$MONGO_CONTAINER" mongosh --quiet "${args[@]}" --eval \
    "const d=db.getSiblingDB('$DB_NAME'); const q={scan_status:{\$in:['pending_scan','scanning']}}; print(d.storage_objects.countDocuments(q)+d.media_assets.countDocuments(q))" 2>/dev/null \
    | tail -1 | grep -E '^[0-9]+$' || true
}
free_mb() { awk '/MemAvailable/ {print int($2/1024)}' "$MEMINFO" 2>/dev/null || echo 0; }
running() { [ "$(docker inspect -f '{{.State.Running}}' "$CTR" 2>/dev/null)" = true ]; }

PENDING=$(pending_count)
if [ -z "$PENDING" ]; then log "cannot read the scan queue (is MongoDB up?); nothing changed"; exit 0; fi

if [ "$PENDING" -gt 0 ]; then
  rm -f "$IDLE_FILE"
  if running; then log "$PENDING file(s) waiting; ClamAV is running, the backend scans them"; exit 0; fi
  FREE=$(free_mb)
  if [ "${FREE:-0}" -lt "$MIN_FREE_MB" ]; then
    log "$PENDING file(s) waiting but only ${FREE} MB free (need $MIN_FREE_MB); ClamAV not started, the files stay in quarantine"
    exit 0
  fi
  log "$PENDING file(s) waiting and ${FREE} MB free: starting $CTR"
  if docker inspect "$CTR" >/dev/null 2>&1; then
    docker start "$CTR" >/dev/null || log "docker start $CTR failed"
  else
    docker compose --env-file "$D/.env.production" -f "$D/docker-compose.production.yml" up -d clamav >/dev/null || log "compose up clamav failed"
  fi
  exit 0
fi

# nothing waits: stop the scanner once the queue has stayed empty for IDLE_STOP_MIN minutes
running || { rm -f "$IDLE_FILE"; exit 0; }
[ -r "$IDLE_FILE" ] || echo "$NOW" > "$IDLE_FILE"
SINCE=$(cat "$IDLE_FILE" 2>/dev/null || echo "$NOW")
if [ $(( NOW - SINCE )) -ge $(( IDLE_STOP_MIN * 60 )) ]; then
  log "queue empty for ${IDLE_STOP_MIN} min: stopping $CTR to free its memory"
  docker stop "$CTR" >/dev/null && rm -f "$IDLE_FILE"
fi
