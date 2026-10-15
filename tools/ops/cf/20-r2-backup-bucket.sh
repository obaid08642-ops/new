#!/bin/bash
# D-33 off-server backups (reviewer, 2026-10-15): the private R2 bucket and a key limited to it, made here with the
# Global API Key, never by hand. Runs on the GitHub runner BEFORE the server tasks (server-ops step "R2 backup bucket",
# only when tools/ops/RUN lists r2-backup-bucket); tasks/61-backups-env.sh then writes the key into .env.production.
#   1. bucket R2_BACKUP_BUCKET (default nabd-plus-backups): created if missing, must not be public (no r2.dev URL,
#      no custom domain), must not be the public CDN bucket
#   2. lifecycle: every object expires after 30 days; unfinished multipart uploads after 7
#   3. key: a user API token with only "Workers R2 Storage Bucket Item Read/Write" on that one bucket; S3 access key
#      id = token id, secret = sha256(token value). Made only when the server has no BACKUP_S3_ACCESS_KEY_ID yet
#      (or R2_ROTATE=1); an older token of the same name is deleted so only one exists.
#   4. delivery: the four BACKUP_S3_* lines go to the server on stdin of R2_DELIVER_CMD (ssh 'umask 077; cat > file').
# Prints only "r2:" status lines with names, ids of permission groups and counts; never a key, token or secret.
# Env: CF/CFE (tools/ops/cf/_auth.sh), Z (zone id), R2_HAS_KEY_CMD (exit 0 when the server already has a key),
#      R2_DELIVER_CMD, CF_API (rehearsal: a stand-in API).
set -uo pipefail
. "$(dirname "$0")/_auth.sh"
API=${CF_API:-https://api.cloudflare.com/client/v4}
BUCKET=${R2_BACKUP_BUCKET:-nabd-plus-backups}
TOKEN_NAME="nabd-backups-server ($BUCKET)"
fail() { echo "r2: FAIL $*"; exit 1; }
ok() { jq -e '.success == true' >/dev/null 2>&1; }
errs() { jq -r '[.errors[]?.message] | join("; ")' 2>/dev/null | cut -c1-200; }

A=$(cf_curl "$API/zones/$Z" | jq -r '.result.account.id // empty')
[ -n "$A" ] || fail "cannot read the account id from the zone"
echo "r2: account found (zone's account), bucket $BUCKET"

# ---------------------------------------------------------------- 1. private bucket
R=$(cf_curl "$API/accounts/$A/r2/buckets/$BUCKET")
if echo "$R" | ok; then
  echo "r2: bucket $BUCKET exists"
else
  R=$(cf_curl -X POST -H 'Content-Type: application/json' "$API/accounts/$A/r2/buckets" --data "{\"name\":\"$BUCKET\"}")
  echo "$R" | ok || fail "bucket create: $(echo "$R" | errs)"
  echo "r2: bucket $BUCKET created"
fi
R=$(cf_curl "$API/accounts/$A/r2/buckets/$BUCKET/domains/managed")
[ "$(echo "$R" | jq -r '.result.enabled // false')" = false ] || fail "bucket $BUCKET has its public r2.dev URL enabled"
R=$(cf_curl "$API/accounts/$A/r2/buckets/$BUCKET/domains/custom")
N=$(echo "$R" | jq -r '(.result.domains // []) | length')
[ "$N" = 0 ] || fail "bucket $BUCKET has $N custom domain(s), so it is public"
echo "r2: bucket is private (r2.dev off, no custom domain)"

# ---------------------------------------------------------------- 2. 30-day expiry
RULES='{"rules":[{"id":"expire-backups-30-days","enabled":true,"conditions":{"prefix":""},"deleteObjectsTransition":{"condition":{"type":"Age","maxAge":2592000}},"abortMultipartUploadsTransition":{"condition":{"type":"Age","maxAge":604800}}}]}'
R=$(cf_curl -X PUT -H 'Content-Type: application/json' "$API/accounts/$A/r2/buckets/$BUCKET/lifecycle" --data "$RULES")
echo "$R" | ok || fail "lifecycle: $(echo "$R" | errs)"
R=$(cf_curl "$API/accounts/$A/r2/buckets/$BUCKET/lifecycle")
[ "$(echo "$R" | jq -r '[.result.rules[]? | select(.enabled == true and .deleteObjectsTransition.condition.maxAge == 2592000)] | length')" = 1 ] \
  || fail "lifecycle not read back as 30 days"
echo "r2: lifecycle set and read back: objects expire after 30 days"

# ---------------------------------------------------------------- 3. key limited to the bucket
if [ "${R2_ROTATE:-0}" != 1 ] && bash -c "${R2_HAS_KEY_CMD:-false}" >/dev/null 2>&1; then
  echo "r2: the server already has a backup key; not re-created (R2_ROTATE=1 replaces it)"
  exit 0
fi
PG=$(cf_curl "$API/user/tokens/permission_groups")
echo "$PG" | ok || fail "permission groups: $(echo "$PG" | errs)"
W=$(echo "$PG" | jq -r '.result[] | select(.name == "Workers R2 Storage Bucket Item Write") | .id' | head -1)
RD=$(echo "$PG" | jq -r '.result[] | select(.name == "Workers R2 Storage Bucket Item Read") | .id' | head -1)
[ -n "$W" ] && [ -n "$RD" ] || fail "R2 bucket item permission groups not found"
echo "r2: permission groups: item write $W, item read $RD"
for old in $(cf_curl "$API/user/tokens?per_page=50" | jq -r --arg n "$TOKEN_NAME" '.result[]? | select(.name == $n) | .id'); do
  cf_curl -X DELETE "$API/user/tokens/$old" | ok && echo "r2: older token of the same name deleted"
done
BODY=$(jq -cn --arg n "$TOKEN_NAME" --arg res "com.cloudflare.edge.r2.bucket.${A}_default_${BUCKET}" --arg w "$W" --arg r "$RD" \
  '{name: $n, policies: [{effect: "allow", resources: {($res): "*"}, permission_groups: [{id: $w}, {id: $r}]}]}')
R=$(cf_curl -X POST -H 'Content-Type: application/json' "$API/user/tokens" --data "$BODY")
echo "$R" | ok || fail "token create: $(echo "$R" | errs)"
KID=$(echo "$R" | jq -r '.result.id'); TV=$(echo "$R" | jq -r '.result.value'); unset R
[ -n "$KID" ] && [ -n "$TV" ] && [ "$KID" != null ] && [ "$TV" != null ] || fail "token create returned no id/value"
SEC=$(printf '%s' "$TV" | sha256sum | cut -d' ' -f1); unset TV
echo "r2: key made: one token, item read/write on $BUCKET only"

# ---------------------------------------------------------------- 4. to the server, on stdin only
printf 'BACKUP_S3_ENDPOINT=https://%s.r2.cloudflarestorage.com\nBACKUP_S3_BUCKET=%s\nBACKUP_S3_ACCESS_KEY_ID=%s\nBACKUP_S3_SECRET_ACCESS_KEY=%s\n' \
  "$A" "$BUCKET" "$KID" "$SEC" | bash -c "${R2_DELIVER_CMD:?R2_DELIVER_CMD unset}" \
  || fail "could not hand the key to the server"
unset SEC KID
echo "r2: key handed to the server (names only: BACKUP_S3_ENDPOINT BACKUP_S3_BUCKET BACKUP_S3_ACCESS_KEY_ID BACKUP_S3_SECRET_ACCESS_KEY)"
