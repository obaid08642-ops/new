#!/bin/bash
# Archive in the backup bucket (owner, 2026-10-16): the four old folders and the unused volume are uploaded to
# s3://nabd-plus-backups/archive/ by tasks/71-archive-upload.sh. The bucket used to expire EVERY object after 30 days,
# which would have deleted that archive silently. This applies the scoped lifecycle (_r2-lifecycle.sh): 30 days for
# mongodb/ and catalogue/ (the nightly dumps and the catalogue export, the only prefixes anything writes), nothing for
# archive/. Idempotent; reads the rules back and fails if any rule would still delete archive/ or every prefix.
# Runs on the GitHub runner with the Global API Key (CLOUDFLARE_*). Lines start with "cf:".
set -uo pipefail
. "$(dirname "$0")/_auth.sh"
API=${CF_API:-https://api.cloudflare.com/client/v4}
BUCKET=${R2_BACKUP_BUCKET:-nabd-plus-backups}
fail() { echo "cf: r2 FAIL $*"; exit 1; }
ok() { jq -e '.success == true' >/dev/null 2>&1; }
errs() { jq -r '[.errors[]?.message] | join("; ")' 2>/dev/null | cut -c1-200; }
A=$(cf_curl "$API/zones/$Z" | jq -r '.result.account.id // empty')
[ -n "$A" ] || fail "cannot read the account id from the zone"
echo "cf: r2 bucket $BUCKET: lifecycle before: $(cf_curl "$API/accounts/$A/r2/buckets/$BUCKET/lifecycle" | jq -c '[.result.rules[]? | {id, prefix: .conditions.prefix, delete_days: ((.deleteObjectsTransition.condition.maxAge // 0) / 86400), abort_days: ((.abortMultipartUploadsTransition.condition.maxAge // 0) / 86400)}]')"
. "$(dirname "$0")/_r2-lifecycle.sh"
r2_apply_lifecycle | sed 's/^r2: /cf: r2 /'
echo "cf: r2 bucket $BUCKET: lifecycle after: $(cf_curl "$API/accounts/$A/r2/buckets/$BUCKET/lifecycle" | jq -c '[.result.rules[]? | {id, prefix: .conditions.prefix, delete_days: ((.deleteObjectsTransition.condition.maxAge // 0) / 86400), abort_days: ((.abortMultipartUploadsTransition.condition.maxAge // 0) / 86400)}]')"
echo "cf: r2 archive/ is NOT covered by any deleting rule: yes"
