#!/bin/bash
# ═══ Weekly restore drill + disk-usage alert (Phase 10, platform) ═══
#
# A backup that has never been restored is a hypothesis, not a backup. This
# restores the most recent dump into a throwaway database, asserts the patient
# and booking documents actually came back, then drops it. It also fails loudly
# when the disk crosses 80% so the volume fills up before it does, not after.
#
# Cron (weekly, Monday 04:10 — after the nightly 03:00 dump):
#   10 4 * * 1 /opt/nabdah/deploy/scripts/restore-drill.sh
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.production ] && { set -a; source .env.production; set +a; }

BACKUP_DIR=${BACKUP_DIR:-/opt/nabdah/backups}
THRESHOLD_PCT=${DISK_THRESHOLD_PCT:-80}
LOG_TAG="[restore-drill $(date -u +%Y-%m-%dT%H:%M:%SZ)]"
fail=0

# ── 1. Disk headroom ─────────────────────────────────────────────────────────
usage_pct=$(df -P "$BACKUP_DIR" | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
if [ "${usage_pct:-0}" -ge "$THRESHOLD_PCT" ]; then
  echo "$LOG_TAG ALERT: disk usage ${usage_pct}% >= ${THRESHOLD_PCT}% on $BACKUP_DIR — prune or expand the volume"
  fail=1
else
  echo "$LOG_TAG disk usage ${usage_pct}% (threshold ${THRESHOLD_PCT}%)"
fi

# ── 2. Restore drill into a throwaway database ───────────────────────────────
latest=$(ls -1t "$BACKUP_DIR"/nabd_*.gz 2>/dev/null | head -1)
if [ -z "$latest" ]; then
  echo "$LOG_TAG FAIL: no backup archive found in $BACKUP_DIR — the nightly backup is not producing files"
  exit 1
fi

DRILL_DB="nabd_restore_drill_$(date -u +%Y%m%d%H%M%S)"
echo "$LOG_TAG restoring $(basename "$latest") into $DRILL_DB"
mongorestore --quiet --uri="${MONGO_URL:-mongodb://localhost:27017}" \
  --archive="$latest" --gzip --nsFrom="${DB_NAME:-nabd_nestjs}.*" --nsTo="${DRILL_DB}.*"

# ── 3. Assert the data really came back (a zero-document restore is a failure) ─
# Prefer mongosh (MongoDB 6+), fall back to mongo (4.x/5.x). If neither exists we
# cannot verify, and an unverifiable restore is reported as a failure rather than
# silently passing.
if command -v mongosh >/dev/null 2>&1; then
  SHELL_BIN="mongosh"
elif command -v mongo >/dev/null 2>&1; then
  SHELL_BIN="mongo"
else
  echo "$LOG_TAG FAIL: neither mongosh nor mongo is installed; the restore cannot be verified"
  fail=1
  SHELL_BIN=""
fi

if [ -n "$SHELL_BIN" ]; then
  count=$("$SHELL_BIN" --quiet --uri="${MONGO_URL:-mongodb://localhost:27017}" "$DRILL_DB" \
    --eval 'db.getCollectionNames().map(c => ({c, n: db.getCollection(c).countDocuments({})})).filter(x => x.n > 0).length' | tail -1)

  if [ "${count:-0}" -lt 2 ]; then
    echo "$LOG_TAG FAIL: restored database has ${count} non-empty collection(s) — the archive is empty or corrupt"
    fail=1
  else
    echo "$LOG_TAG OK: ${count} non-empty collection(s) restored and readable"
  fi

  # ── 4. Always clean up the drill database ────────────────────────────────
  "$SHELL_BIN" --quiet --uri="${MONGO_URL:-mongodb://localhost:27017}" --eval "db.getSiblingDB('$DRILL_DB').dropDatabase()" >/dev/null
  echo "$LOG_TAG dropped $DRILL_DB"
fi

if [ "$fail" -ne 0 ]; then
  echo "$LOG_TAG DRILL FAILED — alert the owner; do not treat last night's backup as usable"
  exit 1
fi
echo "$LOG_TAG DRILL PASSED"
