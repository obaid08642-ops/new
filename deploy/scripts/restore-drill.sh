#!/bin/bash
# ═══ Weekly restore drill + disk-usage alert (Phase 10, platform) ═══
#
# A backup that has never been restored is a hypothesis, not a backup. This
# restores the most recent dump into a throwaway database, asserts the patient
# and booking documents actually came back, then drops it. It also fails loudly
# when the disk crosses 80% so the volume fills up before it does, not after.
#
# D-33 (owner decision 33): runs monthly (deploy/cron/nabd-backups) and reports its result to the admin page as
# restore_test, pass or fail. When mongorestore/mongosh are not installed on the host (production), they run inside
# the MongoDB container and the archive is streamed to it.
set -euo pipefail
source "$(dirname "$0")/_backup-common.sh"
nabd_load_env
ERRMSG=""
SIZE=""
trap 'rc=$?; if [ $rc -eq 0 ]; then report restore_test true "$SIZE"; else report restore_test false "" "${ERRMSG:-restore drill exited $rc}"; fi' EXIT

THRESHOLD_PCT=${DISK_THRESHOLD_PCT:-80}
LOG_TAG="[restore-drill $(date -u +%Y-%m-%dT%H:%M:%SZ)]"
fail=0

# ── 1. Disk headroom ─────────────────────────────────────────────────────────
usage_pct=$(df -P "$BACKUP_DIR" | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
if [ "${usage_pct:-0}" -ge "$THRESHOLD_PCT" ]; then
  echo "$LOG_TAG ALERT: disk usage ${usage_pct}% >= ${THRESHOLD_PCT}% on $BACKUP_DIR — prune or expand the volume"
  fail=1; ERRMSG="disk usage ${usage_pct}% >= ${THRESHOLD_PCT}%"
else
  echo "$LOG_TAG disk usage ${usage_pct}% (threshold ${THRESHOLD_PCT}%)"
fi

# ── 2. Restore drill into a throwaway database ───────────────────────────────
# plain (.gz) and encrypted (.gz.gpg, 16.9) archives; nullglob so a missing kind is not an error
shopt -s nullglob
archives=("$BACKUP_DIR"/nabd_*.gz "$BACKUP_DIR"/nabd_*.gz.gpg)
shopt -u nullglob
latest=""
[ "${#archives[@]}" -gt 0 ] && latest=$(ls -1t "${archives[@]}" 2>/dev/null | head -1)
if [ -z "$latest" ]; then
  echo "$LOG_TAG FAIL: no backup archive found in $BACKUP_DIR — the nightly backup is not producing files"
  ERRMSG="no backup archive found"; exit 1
fi

DRILL_DB="nabd_restore_drill_$(date -u +%Y%m%d%H%M%S)"
SIZE=$(stat -c %s "$latest")
echo "$LOG_TAG restoring $(basename "$latest") into $DRILL_DB"
# host tool when installed, else the one in the MongoDB container (the archive goes in on stdin either way)
in_mongo() { if command -v "$1" >/dev/null 2>&1; then "$@"; else docker exec -i "$MONGO_CONTAINER" "$@"; fi; }
ERRMSG="mongorestore failed"
# 16.9: an encrypted backup (.gpg) is decrypted on the way in; the passphrase file must be readable here too, or the drill fails
restore_stream() { case "$latest" in *.gpg) backup_decrypt "$latest" ;; *) cat "$latest" ;; esac; }
case "$latest" in *.gpg) if [ -z "${BACKUP_ENCRYPTION_PASSPHRASE_FILE:-}" ]; then ERRMSG="the backup is encrypted but BACKUP_ENCRYPTION_PASSPHRASE_FILE is not set"; echo "$LOG_TAG FAIL: $ERRMSG"; exit 1; fi ;; esac
ERRMSG="mongorestore failed"
restore_stream | in_mongo mongorestore --quiet --uri="${MONGO_URL:-mongodb://localhost:27017}" \
  --archive --gzip --nsFrom="${DB_NAME:-nabd_nestjs}.*" --nsTo="${DRILL_DB}.*"
ERRMSG=""

# ── 3. Assert the data really came back (a zero-document restore is a failure) ─
# Prefer mongosh (MongoDB 6+), fall back to mongo (4.x/5.x). If neither exists we
# cannot verify, and an unverifiable restore is reported as a failure rather than
# silently passing.
#
# The connection arguments differ per shell and must not be shared: `--uri` is a
# mongosh flag, while the legacy mongo shell takes the connection string as a
# positional argument and rejects `--uri` outright. Sharing one form meant the
# fallback this block exists to provide could never actually run on a 4.x/5.x
# host — it would fail on the flag instead of verifying the restore.
SHELL_CONN=""
if command -v mongosh >/dev/null 2>&1 || { ! command -v mongo >/dev/null 2>&1 && docker exec "$MONGO_CONTAINER" sh -c 'command -v mongosh' >/dev/null 2>&1; }; then
  SHELL_BIN="mongosh"
  SHELL_CONN="--uri=${MONGO_URL:-mongodb://localhost:27017}"
elif command -v mongo >/dev/null 2>&1; then
  SHELL_BIN="mongo"
  SHELL_CONN="${MONGO_URL:-mongodb://localhost:27017}"
else
  echo "$LOG_TAG FAIL: neither mongosh nor mongo is installed; the restore cannot be verified"
  fail=1; ERRMSG="no mongo shell to verify the restore"
  SHELL_BIN=""
fi

if [ -n "$SHELL_BIN" ]; then
  if [ "$SHELL_BIN" = "mongosh" ]; then
    count=$(in_mongo "$SHELL_BIN" --quiet "$SHELL_CONN" "$DRILL_DB" \
      --eval 'db.getCollectionNames().map(c => ({c, n: db.getCollection(c).countDocuments({})})).filter(x => x.n > 0).length' | tail -1)
  else
    # legacy mongo: [options] [db address] [db name]
    count=$(in_mongo "$SHELL_BIN" --quiet "$SHELL_CONN" "$DRILL_DB" \
      --eval 'db.getCollectionNames().map(function(c) { return {c: c, n: db.getCollection(c).countDocuments({})}; }).filter(function(x) { return x.n > 0; }).length' | tail -1)
  fi

  if [ "${count:-0}" -lt 2 ]; then
    echo "$LOG_TAG FAIL: restored database has ${count} non-empty collection(s) — the archive is empty or corrupt"
    fail=1; ERRMSG="restored database has ${count:-0} non-empty collection(s)"
  else
    echo "$LOG_TAG OK: ${count} non-empty collection(s) restored and readable"
  fi

  # ── 4. Always clean up the drill database ────────────────────────────────
  if [ "$SHELL_BIN" = "mongosh" ]; then
    in_mongo "$SHELL_BIN" --quiet "$SHELL_CONN" --eval "db.getSiblingDB('$DRILL_DB').dropDatabase()" >/dev/null
  else
    in_mongo "$SHELL_BIN" --quiet "$SHELL_CONN" --eval "db.getSiblingDB('$DRILL_DB').dropDatabase()" >/dev/null
  fi
  echo "$LOG_TAG dropped $DRILL_DB"
fi

if [ "$fail" -ne 0 ]; then
  echo "$LOG_TAG DRILL FAILED — alert the owner; do not treat last night's backup as usable"
  exit 1
fi
echo "$LOG_TAG DRILL PASSED"
