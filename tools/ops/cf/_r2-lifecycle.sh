# Sourced by tools/ops/cf/20-r2-backup-bucket.sh and 42-r2-archive-prefix.sh. R2 lifecycle of the private backup bucket.
#
# Until 2026-10-16 ONE rule expired every object after 30 days (prefix ""). That is right for the nightly dumps (mongodb/)
# and the catalogue export (catalogue/), the only two prefixes anything writes, and wrong for anything meant to be kept:
# an archive uploaded to the bucket would silently disappear 30 days later. Now the 30 days apply to those two prefixes
# only; everything else (archive/) is kept until someone deletes it; unfinished multipart uploads are dropped after 7 days
# for every prefix. Needs: cf_curl (_auth.sh), ok/errs helpers, $API, $A (account), $BUCKET, fail().
R2_LIFECYCLE_RULES='{"rules":[
 {"id":"expire-mongodb-30-days","enabled":true,"conditions":{"prefix":"mongodb/"},"deleteObjectsTransition":{"condition":{"type":"Age","maxAge":2592000}}},
 {"id":"expire-catalogue-30-days","enabled":true,"conditions":{"prefix":"catalogue/"},"deleteObjectsTransition":{"condition":{"type":"Age","maxAge":2592000}}},
 {"id":"abort-multipart-7-days","enabled":true,"conditions":{"prefix":""},"abortMultipartUploadsTransition":{"condition":{"type":"Age","maxAge":604800}}}]}'

r2_apply_lifecycle() {
  local R
  R=$(cf_curl -X PUT -H 'Content-Type: application/json' "$API/accounts/$A/r2/buckets/$BUCKET/lifecycle" --data "$R2_LIFECYCLE_RULES")
  echo "$R" | ok || fail "lifecycle: $(echo "$R" | errs)"
  R=$(cf_curl "$API/accounts/$A/r2/buckets/$BUCKET/lifecycle")
  [ "$(echo "$R" | jq -r '[.result.rules[]? | select(.enabled == true and .conditions.prefix == "mongodb/" and .deleteObjectsTransition.condition.maxAge == 2592000)] | length')" = 1 ] \
    || fail "lifecycle not read back: mongodb/ must expire after 30 days"
  [ "$(echo "$R" | jq -r '[.result.rules[]? | select(.enabled == true and .conditions.prefix == "catalogue/" and .deleteObjectsTransition.condition.maxAge == 2592000)] | length')" = 1 ] \
    || fail "lifecycle not read back: catalogue/ must expire after 30 days"
  # nothing may delete objects outside those two prefixes: an empty prefix, or archive/, with a delete transition is a failure
  [ "$(echo "$R" | jq -r '[.result.rules[]? | select(.enabled == true and .deleteObjectsTransition != null and ((.conditions.prefix // "") | (. == "" or startswith("archive"))))] | length')" = 0 ] \
    || fail "lifecycle read back: a rule deletes objects of every prefix or of archive/"
  echo "r2: lifecycle set and read back: mongodb/ and catalogue/ expire after 30 days; archive/ and any other prefix are kept"
}
