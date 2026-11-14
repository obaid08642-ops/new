#!/bin/bash
# ═══ Oplog slice backup for point-in-time recovery (20.8, RPO <= 15 min) ═══
# Every 10 minutes (deploy/cron/nabd-backups) this dumps the oplog entries written since the previous slice, encrypts them
# (gpg AES-256, the same BACKUP_ENCRYPTION_PASSPHRASE_FILE as the nightly dump, 16.9) and uploads them to the PRIVATE bucket under oplog/. Together with the nightly dump
# (backup.sh records where the oplog stood when it started) a restore can replay the database to any moment, and at most
# one slice interval of writes is ever at risk. The slice name carries its bounds, so the chain can be checked for gaps:
#   oplog/oplog_<fromSec>.<fromInc>_<toSec>.<toInc>.bson.gz.gpg
# The first run starts a chain at "now"; a later run whose start is no longer in the oplog (it rolled over) reports a gap
# and starts a new chain, so the next nightly dump becomes the base again. Reported to the admin page as kind "oplog".
# Filtered to the application database plus transaction commits (admin.$cmd applyOps); no-ops are skipped.
set -uo pipefail
source "$(dirname "$0")/_backup-common.sh"
source "$(dirname "$0")/_oplog-mongo-wait.sh"
nabd_load_env

STATE="$BACKUP_DIR/oplog.state"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
fail() { echo "[$(date)] FAIL oplog slice: $1"; report oplog false "" "$1"; exit 1; }

# A deploy restarts Mongo, so a slice taken then fails for a reason that heals itself. Such a failure must not mail the owner:
#  - while the deploy lock is held, or Mongo started less than OPLOG_RESTART_GRACE seconds ago, the run is skipped quietly;
#  - any other transient failure is retried once after OPLOG_RETRY_DELAY seconds, and only a second failure is reported.
# A skipped or failed run never advances the state file, so the next slice starts at the old bound and covers the whole
# interval: the chain has no gap. Permanent problems (configuration, GAP) are reported at once.
DEPLOY_LOCK="${NABD_DEPLOY_LOCK:-/opt/nabdah/deploy.lock}"
deploy_in_progress() {
  [ -e "$DEPLOY_LOCK" ] || return 1
  # a lock older than NABD_DEPLOY_LOCK_MAX_MIN minutes is a crashed deploy, not a running one
  [ -z "$(find "$DEPLOY_LOCK" -mmin +"${NABD_DEPLOY_LOCK_MAX_MIN:-45}" 2>/dev/null)" ]
}
mongo_just_started() {
  local started t now
  started=$(docker inspect -f '{{.State.StartedAt}}' "$MONGO_CONTAINER" 2>/dev/null) || return 1
  t=$(date -d "$started" +%s 2>/dev/null) || return 1
  now=$(date +%s)
  [ $((now - t)) -lt "${OPLOG_RESTART_GRACE:-300}" ]
}
quiet_skip() { echo "[$(date)] oplog slice skipped ($1); the next run covers the interval from $(cat "$STATE" 2>/dev/null)"; exit 0; }
LAST_ERR=""
transient() { LAST_ERR="$1"; return 10; }

ERR=$(private_bucket_error)
[ -z "$ERR" ] || fail "$ERR"
backup_encryption_enabled || fail "BACKUP_ENCRYPTION_PASSPHRASE_FILE not set (oplog slices contain every write and are never uploaded in the clear)"
ENCERR=$(BACKUP_REQUIRE_ENCRYPTION=1 backup_encryption_error)
[ -z "$ENCERR" ] || fail "$ENCERR"
mkdir -p "$BACKUP_DIR"


slice_once() {
  HEAD=$(oplog_head)
  [ -n "$HEAD" ] || { transient "cannot read the newest oplog entry (is this a replica set?)"; return; }
  read -r TO_S TO_I <<<"$HEAD"

  if [ -r "$STATE" ] && read -r FROM_S FROM_I < "$STATE" && [ -n "${FROM_I:-}" ]; then
    :
  else
    # first slice: the chain starts here, nothing earlier is claimed
    echo "$TO_S $TO_I" > "$STATE"
    echo "[$(date)] oplog chain started at $TO_S.$TO_I"
    mongo_mark
    report oplog true 0
    exit 0
  fi

  if [ "$TO_S" = "$FROM_S" ] && [ "$TO_I" = "$FROM_I" ]; then
    # nothing was written since the last slice: a slice from X to X would cover nothing (and once looped the DR planner for ever)
    echo "[$(date)] oplog: no new entries since $FROM_S.$FROM_I, no slice written"
    report oplog true 0
    return 0
  fi

  NAME="oplog_${FROM_S}.${FROM_I}_${TO_S}.${TO_I}.bson.gz.gpg"
  QUERY=$(printf '{"ts":{"$gt":{"$timestamp":{"t":%s,"i":%s}},"$lte":{"$timestamp":{"t":%s,"i":%s}}},"op":{"$ne":"n"},"$or":[{"ns":{"$regex":"^%s\\\\."}},{"ns":"admin.$cmd","o.applyOps":{"$exists":true}}]}' \
    "$FROM_S" "$FROM_I" "$TO_S" "$TO_I" "$DB_NAME")
  ARGS=()
  while IFS= read -r a; do ARGS+=("$a"); done < <(mongo_auth)

  # a slice must start inside the oplog: if the oldest entry is newer than FROM, writes were lost to rollover
  OLDEST=$(docker exec "$MONGO_CONTAINER" mongosh --quiet "${ARGS[@]}" --eval \
    'const t=db.getSiblingDB("local").oplog.rs.find({},{ts:1}).sort({$natural:1}).limit(1).next().ts; print(t.getHighBits()+" "+t.getLowBits())' 2>/dev/null | tail -1)
  read -r OLD_S OLD_I <<<"$OLDEST"
  if [ -n "${OLD_S:-}" ] && { [ "$OLD_S" -gt "$FROM_S" ] || { [ "$OLD_S" -eq "$FROM_S" ] && [ "$OLD_I" -gt "$FROM_I" ]; }; }; then
    echo "$TO_S $TO_I" > "$STATE"
    fail "GAP: the oplog rolled over before slice $FROM_S.$FROM_I (oldest entry $OLD_S.$OLD_I); a new chain starts at $TO_S.$TO_I, run backup.sh now"
  fi

  MONGODUMP_ALLOW_EMPTY=1 mongodump_oneoff "$TMP/$NAME.raw" --db=local --collection=oplog.rs --query="$QUERY" --out - >/dev/null || { rm -f "$TMP/$NAME.raw"; transient "mongodump of the oplog failed"; return; }
  gzip -c < "$TMP/$NAME.raw" | backup_encrypt_stream > "$TMP/$NAME" || { rm -f "$TMP/$NAME.raw"; transient "compressing or encrypting the oplog slice failed"; return; }
  rm -f "$TMP/$NAME.raw"
  [ -s "$TMP/$NAME" ] || { transient "the oplog slice is empty (encryption failed)"; return; }
  SIZE=$(stat -c %s "$TMP/$NAME")

  OUT=$(backup_aws s3 cp "$TMP/$NAME" "s3://$BACKUP_S3_BUCKET/oplog/$NAME" --only-show-errors 2>&1) \
    || { transient "upload failed: $(printf '%s' "$OUT" | tail -3)"; return; }
  echo "$TO_S $TO_I" > "$STATE"
  echo "[$(date)] oplog slice uploaded: oplog/$NAME ($SIZE bytes)"
  report oplog true "$SIZE"
  return 0
}

deploy_in_progress && quiet_skip "deploy in progress"
slice_once; rc=$?
if [ "$rc" -eq 10 ]; then
  deploy_in_progress && quiet_skip "deploy started during the run: $LAST_ERR"
  mongo_just_started && quiet_skip "mongo restarted less than ${OPLOG_RESTART_GRACE:-300}s ago: $LAST_ERR"
  # Mongo restarting (OOM kill, health failure) is the usual cause: wait until it is healthy again, then try once more.
  if ! mongo_healthy; then
    echo "[$(date)] oplog slice failed ($LAST_ERR) and Mongo is not healthy; waiting up to ${OPLOG_HEALTHY_WAIT:-240}s for it"
    wait_mongo_healthy "${OPLOG_HEALTHY_WAIT:-240}" || fail "$LAST_ERR; Mongo was not healthy for ${OPLOG_HEALTHY_WAIT:-240}s. $(mongo_restart_note)"
    deploy_in_progress && quiet_skip "deploy in progress while waiting for Mongo: $LAST_ERR"
  fi
  echo "[$(date)] oplog slice failed ($LAST_ERR); retrying once in ${OPLOG_RETRY_DELAY:-20}s"
  sleep "${OPLOG_RETRY_DELAY:-20}"
  deploy_in_progress && quiet_skip "deploy in progress on retry: $LAST_ERR"
  slice_once; rc=$?
  [ "$rc" -ne 10 ] || fail "$LAST_ERR (after one retry). $(mongo_restart_note)"
fi
[ "$rc" -eq 0 ] && mongo_mark
exit "$rc"
