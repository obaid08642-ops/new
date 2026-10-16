# READ-ONLY (review session, 2026-10-16). Two questions, nothing is changed:
#  1. Why the owner's Cloudflare sign-in is refused on admin.nabd.plus: the Access application for that host and its
#     policies (include/require/exclude rule TYPES and the e-mail domains/addresses they name).
#  2. How many product pictures the CDN bucket holds per product code (object keys only, no file contents), to
#     backfill images[] (issue 1556).
# Output goes into the encrypted report; the public log shows only "cf:" lines.
. tools/ops/cf/_auth.sh
API=https://api.cloudflare.com/client/v4
echo "cf: credential $(cf_verify)"
A=$(cf_curl "$API/zones/$Z" | jq -r '.result.account.id // empty')
[ -n "$A" ] || { echo "cf: no account id"; exit 0; }

echo "## access applications"
cf_curl "$API/accounts/$A/access/apps?per_page=100" > apps.json
jq -r '"cf: access apps success=\(.success) count=\(.result|length) errors=\([.errors[]?.message]|join("; "))"' apps.json
jq -c '.result[]? | {id, name, domain, type, self_hosted_domains, destinations: [.destinations[]?.uri], session_duration, allowed_idps, auto_redirect_to_identity}' apps.json
for id in $(jq -r '.result[]? | select((.domain // "") | test("admin")) | .id' apps.json); do
  echo "## policies of app $id"
  cf_curl "$API/accounts/$A/access/apps/$id/policies" | jq -c '.result[]? | {name, decision, precedence, include, require, exclude}'
done
echo "## reusable policies"
cf_curl "$API/accounts/$A/access/policies?per_page=100" | jq -c '.result[]? | {id, name, decision, include, require, exclude, app_count}'
echo "## identity providers"
cf_curl "$API/accounts/$A/access/identity_providers" | jq -c '.result[]? | {id, name, type}'
rm -f apps.json

echo "## r2 buckets"
cf_curl "$API/accounts/$A/r2/buckets" | jq -r '.result.buckets[]?.name' > buckets.txt
for b in $(cat buckets.txt); do
  dom=$(cf_curl "$API/accounts/$A/r2/buckets/$b/domains/custom" | jq -r '[.result.domains[]?.domain]|join(",")')
  echo "bucket $b custom_domains=$dom"
  case ",$dom," in *,cdn.nabd.plus,*) CDN_BUCKET=$b;; esac
done
rm -f buckets.txt
if [ -n "${CDN_BUCKET:-}" ]; then
  echo "## keys of $CDN_BUCKET (name and size only)"
  : > keys.txt; cursor=""
  for i in $(seq 1 400); do
    R=$(cf_curl "$API/accounts/$A/r2/buckets/$CDN_BUCKET/objects?per_page=1000${cursor:+&cursor=$cursor}")
    echo "$R" | jq -r '.result[]? | "\(.key) \(.size)"' >> keys.txt
    cursor=$(echo "$R" | jq -r '.result_info.cursor // empty')
    trunc=$(echo "$R" | jq -r '.result_info.is_truncated // false')
    [ "$trunc" = true ] && [ -n "$cursor" ] || break
  done
  echo "cf: cdn bucket keys listed: $(wc -l < keys.txt)"
  echo "-----BEGIN CDN KEYS-----"; gzip -c keys.txt | base64 -w 0; echo; echo "-----END CDN KEYS-----"
  rm -f keys.txt
else
  echo "cf: no bucket with the custom domain cdn.nabd.plus"
fi
