# CHANGES CLOUDFLARE (review session, 2026-10-16, for the owner's sign-in to admin.nabd.plus).
# Found by run 38849057276: the "Admin Portal" Access app allows only obaid08642@gmail.com ("Owner only" policy),
# and the account's only login method is "cloudflare" (sign in with a Cloudflare account). The owner's Cloudflare
# account uses a different e-mail, so Access refuses them.
# Fix: add the "One-time PIN" login method (Access e-mails a code to the address typed in). The app allows every login
# method (allowed_idps is empty), and the policy stays "Owner only": only obaid08642@gmail.com can receive a code that
# opens the page. Nothing else changes. Idempotent: an existing One-time PIN method is kept.
. tools/ops/cf/_auth.sh
API=https://api.cloudflare.com/client/v4
A=$(cf_curl "$API/zones/$Z" | jq -r '.result.account.id // empty')
[ -n "$A" ] || { echo "cf: no account id"; exit 0; }
HAS=$(cf_curl "$API/accounts/$A/access/identity_providers" | jq -r '[.result[]? | select(.type=="onetimepin")] | length')
if [ "${HAS:-0}" -gt 0 ]; then
  echo "cf: one-time PIN login already present"
else
  cf_curl -X POST -H 'Content-Type: application/json' "$API/accounts/$A/access/identity_providers" \
    --data '{"name":"One-time PIN","type":"onetimepin","config":{}}' \
    | jq -r '"cf: one-time PIN login added success=\(.success) errors=\([.errors[]?.message]|join("; "))"'
fi
APP=$(cf_curl "$API/accounts/$A/access/apps?per_page=100" | jq -c '.result[]? | select(.domain=="admin.nabd.plus") | {id, allowed_idps}')
echo "cf: admin app $(echo "$APP" | jq -c '{allowed_idps}')"
echo "cf: login methods now $(cf_curl "$API/accounts/$A/access/identity_providers" | jq -c '[.result[]?.type]')"
