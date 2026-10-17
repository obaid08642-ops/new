#!/bin/bash
# ═══ Nightly backup (D-33, owner decision 33): mongodump → local (14 days) + off-server copy ═══
# The off-server copy goes ONLY to the private bucket (BACKUP_S3_*), never to S3_BUCKET, the public CDN bucket
# (incident 2026-10-08: backups uploaded there were downloadable by anyone). The bucket expires copies after 30 days
# (backup-bucket-lifecycle.sh). Both runs are reported to the admin page (D-34). Schedule: deploy/cron/nabd-backups.
# Exit: 0 only when the local dump AND the off-server copy succeeded.
set -uo pipefail
source "$(dirname "$0")/_backup-common.sh"
nabd_load_env

TS=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/nabd_${DB_NAME}_$TS.gz"
mkdir -p "$BACKUP_DIR"

# 20.8: where the oplog stood just before the dump started; point-in-time recovery replays the oplog from here
OPLOG_START=$(oplog_head)
[ -n "$OPLOG_START" ] || echo "[$(date)] WARN: oplog position unreadable, this dump cannot be used as the base of a point-in-time recovery"

echo "[$(date)] mongodump $DB_NAME"
if ! docker exec "$MONGO_CONTAINER" mongodump --quiet \
       -u "${MONGO_ROOT_USER:-}" -p "${MONGO_ROOT_PASSWORD:-}" --authenticationDatabase admin \
       --db="$DB_NAME" --archive --gzip > "$FILE" || [ ! -s "$FILE" ]; then
  rm -f "$FILE"
  echo "[$(date)] FAIL: mongodump failed or wrote nothing"
  report local false "" "mongodump failed or wrote nothing"
  exit 1
fi
[ -z "$OPLOG_START" ] || printf '%s\n' "$OPLOG_START" > "$FILE.oplogts"
SIZE=$(stat -c %s "$FILE")
echo "[$(date)] local backup: $(basename "$FILE") ($SIZE bytes)"
report local true "$SIZE"

# retention: 14 days on the server
find "$BACKUP_DIR" -maxdepth 1 \( -name "nabd_*.gz" -o -name "nabd_*.gz.oplogts" \) -mtime +14 -delete

ERR=$(private_bucket_error)
if [ -n "$ERR" ]; then
  echo "[$(date)] FAIL off-server copy: $ERR"
  report offsite false "" "$ERR"
  exit 1
fi
KEY="mongodb/$(basename "$FILE")"
UPLOAD="$FILE"
# 20.8: with BACKUP_ENCRYPTION_KEY set the off-server copy is AES-256 encrypted (.enc); the key stays on the server and in the owner's safe
if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  UPLOAD="$FILE.enc"; KEY="$KEY.enc"
  encrypt_stream < "$FILE" > "$UPLOAD" || { rm -f "$UPLOAD"; report offsite false "" "encryption failed"; echo "[$(date)] FAIL off-server copy: encryption failed"; exit 1; }
fi
if OUT=$(backup_aws s3 cp "$UPLOAD" "s3://$BACKUP_S3_BUCKET/$KEY" --only-show-errors 2>&1) \
   && { [ ! -f "$FILE.oplogts" ] || OUT=$(backup_aws s3 cp "$FILE.oplogts" "s3://$BACKUP_S3_BUCKET/$KEY.oplogts" --only-show-errors 2>&1); }; then
  [ "$UPLOAD" = "$FILE" ] || rm -f "$UPLOAD"
  echo "[$(date)] off-server copy: s3://$BACKUP_S3_BUCKET/$KEY"
  report offsite true "$SIZE"
else
  [ "$UPLOAD" = "$FILE" ] || rm -f "$UPLOAD"
  OUT=$(printf '%s' "$OUT" | tail -3)
  echo "[$(date)] FAIL off-server copy: $OUT"
  report offsite false "" "upload failed: $OUT"
  exit 1
fi
echo "[$(date)] done."
