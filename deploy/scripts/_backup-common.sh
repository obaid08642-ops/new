#!/bin/bash
# Shared by backup.sh, catalogue-export.sh, restore-drill.sh and backup-bucket-lifecycle.sh (D-33, owner decision 33).
# Sourced, not run. Loads the env file, checks the PRIVATE backup bucket and reports runs to the admin page (D-34).
# No function here prints a secret: keys and tokens reach curl and aws through stdin or the environment, never argv.

# NABD_ENV_FILE replaces deploy/.env.production (tests set it to /dev/null)
nabd_load_env() {
  local f=${NABD_ENV_FILE:-$(dirname "${BASH_SOURCE[0]}")/../.env.production}
  if [ -r "$f" ]; then set -a; source "$f"; set +a; fi
  BACKUP_DIR=${BACKUP_DIR:-/opt/nabdah/backups}
  DB_NAME=${DB_NAME:-nabd_nestjs}
}

# report <kind> <ok true|false> [size_bytes] [error]: POST <BACKUP_REPORT_URL>/api/v1/ops/backup-runs.
# A report that cannot be sent is logged and never fails the run.
report() {
  local kind=$1 ok=$2 size=${3:-} err=${4:-} body
  [ -n "${BACKUP_REPORT_URL:-}" ] && [ -n "${BACKUP_REPORT_TOKEN:-}" ] || { echo "report $kind: BACKUP_REPORT_URL or BACKUP_REPORT_TOKEN unset, not reported"; return 0; }
  err=$(printf '%s' "$err" | tr -d '"\\\r' | tr '\n' ' ' | cut -c1-300)
  body="{\"kind\":\"$kind\",\"ok\":$ok,\"finished_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
  [ -n "$size" ] && body="$body,\"size_bytes\":$size"
  [ -n "$err" ] && body="$body,\"error\":\"$err\""
  body="$body}"
  local code
  code=$(printf 'Authorization: Bearer %s\n' "$BACKUP_REPORT_TOKEN" \
    | curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "${BACKUP_REPORT_URL%/}/api/v1/ops/backup-runs" \
        -H @- -H 'Content-Type: application/json' --data-binary "$body")
  case "$code" in 20?) ;; *) echo "report $kind: not accepted (HTTP $code)" ;; esac
  return 0
}

# private_bucket_error: empty when the private bucket is usable; it must be configured and must not be S3_BUCKET
# (the public CDN bucket, incident 2026-10-08)
private_bucket_error() {
  if [ -z "${BACKUP_S3_BUCKET:-}" ] || [ -z "${BACKUP_S3_ENDPOINT:-}" ] || [ -z "${BACKUP_S3_ACCESS_KEY_ID:-}" ] || [ -z "${BACKUP_S3_SECRET_ACCESS_KEY:-}" ]; then
    echo "private backup bucket not configured (BACKUP_S3_*)"
  elif [ "$BACKUP_S3_BUCKET" = "${S3_BUCKET:-}" ] || { [ -n "${S3_ACCESS_KEY_ID:-}" ] && [ "$BACKUP_S3_ACCESS_KEY_ID" = "$S3_ACCESS_KEY_ID" ]; }; then
    echo "refused: the backup bucket or key is the public CDN one (S3_BUCKET)"
  fi
}

# backup_aws <aws args…>: aws with the backup key only, against the private endpoint
backup_aws() {
  env -u AWS_SESSION_TOKEN -u AWS_PROFILE \
    AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
    aws "$@" --endpoint-url "$BACKUP_S3_ENDPOINT" --region "${BACKUP_S3_REGION:-auto}"
}

# ── 16.9 encrypted backups ───────────────────────────────────────────────────────────────────────────────────────────────
# The dump holds every patient's medical record, so it is encrypted (gpg symmetric, AES-256, integrity-protected) before it
# is kept or leaves the server. The passphrase is NOT on the server's backup disk or in the bucket: the owner keeps it in the
# password manager and in a sealed copy (without it no backup can be restored), and the server reads it from the file named by
# BACKUP_ENCRYPTION_PASSPHRASE_FILE (mode 0400, root). BACKUP_REQUIRE_ENCRYPTION=1 (set in .env.production.example) makes a
# backup fail when no passphrase is configured instead of writing a readable dump.

# backup_encryption_error: empty when encryption is usable or not asked for; text when it is asked for and broken
backup_encryption_error() {
  local f=${BACKUP_ENCRYPTION_PASSPHRASE_FILE:-}
  if [ -z "$f" ]; then
    [ "${BACKUP_REQUIRE_ENCRYPTION:-0}" = 1 ] && echo "BACKUP_REQUIRE_ENCRYPTION=1 but BACKUP_ENCRYPTION_PASSPHRASE_FILE is not set"
    return 0
  fi
  command -v gpg >/dev/null 2>&1 || { echo "gpg is not installed (needed for BACKUP_ENCRYPTION_PASSPHRASE_FILE)"; return 0; }
  [ -r "$f" ] || { echo "BACKUP_ENCRYPTION_PASSPHRASE_FILE $f is not readable"; return 0; }
  [ "$(tr -d '\n\r' < "$f" | wc -c)" -ge 32 ] || echo "the backup passphrase in $f is shorter than 32 characters"
}

backup_encryption_enabled() { [ -n "${BACKUP_ENCRYPTION_PASSPHRASE_FILE:-}" ]; }

# backup_encrypt <plain> <out>: AES-256 symmetric; the passphrase is read from the file, never from argv
backup_encrypt() {
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-file "$BACKUP_ENCRYPTION_PASSPHRASE_FILE" \
      --symmetric --cipher-algo AES256 --compress-algo none -o "$2" "$1"
}

# backup_decrypt <encrypted>: the plain archive on stdout
backup_decrypt() {
  gpg --batch --quiet --pinentry-mode loopback --passphrase-file "$BACKUP_ENCRYPTION_PASSPHRASE_FILE" --decrypt "$1"
}

# the container mongo tools run in on the server
MONGO_CONTAINER=${MONGO_CONTAINER:-nabdah-mongodb}

# ── Point-in-time recovery helpers (20.8) ───────────────────────────────────
# mongo_auth: credential arguments for the mongo tools in the container (none when no root user is configured)
mongo_auth() {
  [ -n "${MONGO_ROOT_USER:-}" ] && printf '%s\n' -u "$MONGO_ROOT_USER" -p "${MONGO_ROOT_PASSWORD:-}" --authenticationDatabase admin
  return 0
}

# oplog_head: "<seconds> <increment>" of the newest oplog entry, empty when it cannot be read
oplog_head() {
  local args=() a
  while IFS= read -r a; do args+=("$a"); done < <(mongo_auth)
  docker exec "$MONGO_CONTAINER" mongosh --quiet "${args[@]}" --eval \
    'const t=db.getSiblingDB("local").oplog.rs.find({},{ts:1}).sort({$natural:-1}).limit(1).next().ts; print(t.getHighBits()+" "+t.getLowBits())' 2>/dev/null \
    | tail -1 | grep -E '^[0-9]+ [0-9]+$' || true
}

# backup_encrypt_stream: stdin -> stdout, same gpg AES-256 and passphrase file as backup_encrypt (16.9)
backup_encrypt_stream() {
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-file "$BACKUP_ENCRYPTION_PASSPHRASE_FILE" \
      --symmetric --cipher-algo AES256 --compress-algo none
}

# report_dr <kind> <ok> <rpo_seconds> <rto_seconds> [error]: like report, with the measured recovery numbers
report_dr() {
  local kind=$1 ok=$2 rpo=$3 rto=$4 err=${5:-} body code
  [ -n "${BACKUP_REPORT_URL:-}" ] && [ -n "${BACKUP_REPORT_TOKEN:-}" ] || { echo "report $kind: BACKUP_REPORT_URL or BACKUP_REPORT_TOKEN unset, not reported"; return 0; }
  err=$(printf '%s' "$err" | tr -d '"\\\r' | tr '\n' ' ' | cut -c1-300)
  body="{\"kind\":\"$kind\",\"ok\":$ok,\"finished_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
  [ -n "$rpo" ] && body="$body,\"rpo_seconds\":$rpo"
  [ -n "$rto" ] && body="$body,\"rto_seconds\":$rto"
  [ -n "$err" ] && body="$body,\"error\":\"$err\""
  body="$body}"
  code=$(printf 'Authorization: Bearer %s\n' "$BACKUP_REPORT_TOKEN" \
    | curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "${BACKUP_REPORT_URL%/}/api/v1/ops/backup-runs" \
        -H @- -H 'Content-Type: application/json' --data-binary "$body")
  case "$code" in 20?) ;; *) echo "report $kind: not accepted (HTTP $code)" ;; esac
  return 0
}

# mongodump in a one-off container, not inside the capped nabdah-mongodb (2026-10-30: the dump was OOM-killed there and left 0 bytes)
source "$(dirname "${BASH_SOURCE[0]}")/_mongodump-oneoff.sh"
