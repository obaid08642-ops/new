#!/bin/bash
# ═══ Oplog slice backup for point-in-time recovery (20.8, RPO <= 15 min) ═══
# Every 10 minutes (deploy/cron/nabd-backups) this dumps the oplog entries written since the previous slice, encrypts them
# (AES-256, BACKUP_ENCRYPTION_KEY) and uploads them to the PRIVATE bucket under oplog/. Together with the nightly dump
# (backup.sh records where the oplog stood when it started) a restore can replay the database to any moment, and at most
# one slice interval of writes is ever at risk. The slice name carries its bounds, so the chain can be checked for gaps:
#   oplog/oplog_<fromSec>.<fromInc>_<toSec>.<toInc>.bson.gz.enc
# The first run starts a chain at "now"; a later run whose start is no longer in the oplog (it rolled over) reports a gap
# and starts a new chain, so the next nightly dump becomes the base again. Reported to the admin page as kind "oplog".
# Filtered to the application database plus transaction commits (admin.$cmd applyOps); no-ops are skipped.
set -uo pipefail
source "$(dirname "$0")/_backup-common.sh"
nabd_load_env

STATE="$BACKUP_DIR/oplog.state"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
fail() { echo "[$(date)] FAIL oplog slice: $1"; report oplog false "" "$1"; exit 1; }

ERR=$(private_bucket_error)
[ -z "$ERR" ] || fail "$ERR"
[ -n "${BACKUP_ENCRYPTION_KEY:-}" ] || fail "BACKUP_ENCRYPTION_KEY not set (oplog slices contain every write and are never uploaded in the clear)"
mkdir -p "$BACKUP_DIR"

HEAD=$(oplog_head)
[ -n "$HEAD" ] || fail "cannot read the newest oplog entry (is this a replica set?)"
read -r TO_S TO_I <<<"$HEAD"

if [ -r "$STATE" ] && read -r FROM_S FROM_I < "$STATE" && [ -n "${FROM_I:-}" ]; then
  :
else
  # first slice: the chain starts here, nothing earlier is claimed
  echo "$TO_S $TO_I" > "$STATE"
  echo "[$(date)] oplog chain started at $TO_S.$TO_I"
  report oplog true 0
  exit 0
fi

NAME="oplog_${FROM_S}.${FROM_I}_${TO_S}.${TO_I}.bson.gz.enc"
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

docker exec "$MONGO_CONTAINER" mongodump --quiet "${ARGS[@]}" --db=local --collection=oplog.rs --query="$QUERY" --out - \
  | gzip -c | encrypt_stream > "$TMP/$NAME" || fail "mongodump of the oplog failed"
[ -s "$TMP/$NAME" ] || fail "the oplog slice is empty (encryption failed)"
SIZE=$(stat -c %s "$TMP/$NAME")

OUT=$(backup_aws s3 cp "$TMP/$NAME" "s3://$BACKUP_S3_BUCKET/oplog/$NAME" --only-show-errors 2>&1) \
  || fail "upload failed: $(printf '%s' "$OUT" | tail -3)"
echo "$TO_S $TO_I" > "$STATE"
echo "[$(date)] oplog slice uploaded: oplog/$NAME ($SIZE bytes)"
report oplog true "$SIZE"
