#!/bin/bash
# URGENT (2026-10-08): full DB backups were uploaded to the PUBLIC R2 bucket behind cdn.nabd.plus
# (backups/nabd_*.gz answered 200 to anyone). Containment:
#  1) delete every object under backups/ in that bucket;
#  2) stop backup.sh from uploading there (local 14-day backups continue);
#  3) verify the public URLs answer 404.
# Prints counts and HTTP codes only; never object contents or secrets.
set -uo pipefail
D=/opt/nabdah/deploy
cd $D || { echo "cleanup: no deploy dir"; exit 1; }
set -a; source .env.production; set +a
export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
A="aws --endpoint-url $S3_ENDPOINT --region auto"
command -v aws >/dev/null || { echo "cleanup: aws cli missing, nothing changed"; exit 1; }

before=$($A s3 ls "s3://$S3_BUCKET/backups/" 2>/dev/null | wc -l)
echo "cleanup: backups objects in public bucket before: $before"
names=$($A s3 ls "s3://$S3_BUCKET/backups/" 2>/dev/null | awk '{print $4}')
$A s3 rm "s3://$S3_BUCKET/backups/" --recursive --only-show-errors
after=$($A s3 ls "s3://$S3_BUCKET/backups/" 2>/dev/null | wc -l)
echo "cleanup: backups objects after: $after"

# 2) disable the upload in the live backup.sh (keep a copy first)
TS=$(date -u +%Y%m%dT%H%M%SZ)
sudo -n cp scripts/backup.sh /opt/nabdah/backups/backup.sh.pre-contain.$TS
if grep -q 'BACKUP_UPLOAD_ENABLED' scripts/backup.sh; then
  echo "cleanup: backup.sh already gated"
else
  sudo -n sed -i 's|^if \[ -n "${S3_ENDPOINT:-}" \] \&\& \[ -n "${S3_BUCKET:-}" \] \&\& \[ -n "${S3_ACCESS_KEY_ID:-}" \]; then|# Upload disabled 2026-10-08: the bucket is public. Re-enable only with a PRIVATE bucket + encryption.\nif [ "${BACKUP_UPLOAD_ENABLED:-0}" = 1 ] \&\& [ -n "${S3_ENDPOINT:-}" ] \&\& [ -n "${S3_BUCKET:-}" ] \&\& [ -n "${S3_ACCESS_KEY_ID:-}" ]; then|' scripts/backup.sh
  grep -q 'BACKUP_UPLOAD_ENABLED' scripts/backup.sh && echo "cleanup: backup.sh upload gated (off)" || echo "cleanup: backup.sh gate FAILED"
fi
bash -n scripts/backup.sh && echo "cleanup: backup.sh syntax ok" || { sudo -n cp /opt/nabdah/backups/backup.sh.pre-contain.$TS scripts/backup.sh; echo "cleanup: syntax error, restored original"; }

# 3) verify public URLs (names only from the listing above)
n=0; for f in $names; do n=$((n+1)); [ $n -gt 5 ] && break
  echo "cleanup: public check $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://cdn.nabd.plus/backups/$f")"; done
echo "cleanup: local backups kept: $(ls /opt/nabdah/backups/nabd_*.gz 2>/dev/null | wc -l)"
