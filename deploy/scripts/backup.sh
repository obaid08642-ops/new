#!/bin/bash
# ═══ Daily backup: mongodump → gzip → local (14d) + Cloudflare R2 ═══
# Installed as host cron: 0 3 * * * /opt/nabdah/deploy/scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env.production; set +a

TS=$(date +%Y%m%d-%H%M%S)
DIR=/opt/nabdah/backups
FILE="$DIR/nabd_${DB_NAME:-nabd_nestjs}_$TS.gz"
mkdir -p "$DIR"

echo "[$(date)] mongodump…"
docker exec nabdah-mongodb mongodump --quiet \
  -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
  --db="${DB_NAME:-nabd_nestjs}" --archive --gzip > "$FILE"
SIZE=$(du -h "$FILE" | cut -f1)
echo "[$(date)] local backup: $FILE ($SIZE)"

# Upload to R2 (S3-compatible) when configured
if [ -n "${S3_ENDPOINT:-}" ] && [ -n "${S3_BUCKET:-}" ] && [ -n "${S3_ACCESS_KEY_ID:-}" ]; then
  export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
  export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
  aws s3 cp "$FILE" "s3://${S3_BUCKET}/backups/$(basename "$FILE")" \
    --endpoint-url "${S3_ENDPOINT}" --region auto \
    && echo "[$(date)] uploaded to R2: backups/$(basename "$FILE")"
fi

# Retention: 14 days local
find "$DIR" -name "nabd_*.gz" -mtime +14 -delete
echo "[$(date)] done."
