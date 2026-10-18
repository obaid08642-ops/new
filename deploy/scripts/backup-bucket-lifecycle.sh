#!/bin/bash
# ═══ 30-day expiry on the private backup bucket (D-33, owner decision 33) ═══
# Run once after the bucket is created (and again if the rule changes). Uses the backup key only and refuses the
# public CDN bucket, like backup.sh.
set -uo pipefail
source "$(dirname "$0")/_backup-common.sh"
nabd_load_env

ERR=$(private_bucket_error)
[ -z "$ERR" ] || { echo "FAIL: $ERR"; exit 1; }
RULES='{"Rules":[{"ID":"expire-backups-30-days","Status":"Enabled","Filter":{"Prefix":""},"Expiration":{"Days":30}}]}'
if backup_aws s3api put-bucket-lifecycle-configuration --bucket "$BACKUP_S3_BUCKET" --lifecycle-configuration "$RULES"; then
  echo "lifecycle set: objects in $BACKUP_S3_BUCKET expire after 30 days"
else
  echo "FAIL: put-bucket-lifecycle-configuration on $BACKUP_S3_BUCKET"; exit 1
fi
