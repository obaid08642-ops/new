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

echo "[$(date)] mongodump $DB_NAME"
if ! docker exec "$MONGO_CONTAINER" mongodump --quiet \
       -u "${MONGO_ROOT_USER:-}" -p "${MONGO_ROOT_PASSWORD:-}" --authenticationDatabase admin \
       --db="$DB_NAME" --archive --gzip > "$FILE" || [ ! -s "$FILE" ]; then
  rm -f "$FILE"
  echo "[$(date)] FAIL: mongodump failed or wrote nothing"
  report local false "" "mongodump failed or wrote nothing"
  exit 1
fi
SIZE=$(stat -c %s "$FILE")
echo "[$(date)] local backup: $(basename "$FILE") ($SIZE bytes)"
report local true "$SIZE"

# retention: 14 days on the server
find "$BACKUP_DIR" -maxdepth 1 -name "nabd_*.gz" -mtime +14 -delete

ERR=$(private_bucket_error)
if [ -n "$ERR" ]; then
  echo "[$(date)] FAIL off-server copy: $ERR"
  report offsite false "" "$ERR"
  exit 1
fi
KEY="mongodb/$(basename "$FILE")"
if OUT=$(backup_aws s3 cp "$FILE" "s3://$BACKUP_S3_BUCKET/$KEY" --only-show-errors 2>&1); then
  echo "[$(date)] off-server copy: s3://$BACKUP_S3_BUCKET/$KEY"
  report offsite true "$SIZE"
else
  OUT=$(printf '%s' "$OUT" | tail -3)
  echo "[$(date)] FAIL off-server copy: $OUT"
  report offsite false "" "upload failed: $OUT"
  exit 1
fi
echo "[$(date)] done."
