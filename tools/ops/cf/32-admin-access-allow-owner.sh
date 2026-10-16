# CHANGES CLOUDFLARE (owner, 2026-10-16: "add obaid08642@gmail.com to the Allow policy of admin.nabd.plus, for the
# e-mail code and for the Google login if Google is used; report the policy before and after, rule types only").
# For the Access application of admin.nabd.plus:
#   1. the owner's e-mail is an `include` rule of its Allow policy (added to the first Allow policy when no Allow
#      policy names it; nothing else in the policy changes)
#   2. the One-time PIN login exists (31-admin-access-otp adds it; added here too when missing)
#   3. when the app lists its allowed logins (allowed_idps not empty), the One-time PIN and every Google login of the
#      account are in that list; an empty list already allows every login
#   4. a `require` rule that pins one login method would still refuse the code: reported as BLOCKED, never guessed
# Prints "cf:" lines with policy names, rule TYPES, login TYPES and counts (the public log shows them); the e-mail
# itself is never printed. Idempotent: a second run changes nothing.
# Env: CF/CFE + Z (tools/ops/cf/_auth.sh); OWNER_EMAIL (default the owner's, confirmed 2026-10-15);
#      ACCESS_HOST (default admin.nabd.plus); CF_API (rehearsal: tools/ops/rehearsal/cf-mock.py).
set -uo pipefail
. "$(dirname "$0")/_auth.sh"
API=${CF_API:-https://api.cloudflare.com/client/v4}
OWNER=${OWNER_EMAIL:-obaid08642@gmail.com}
HOST=${ACCESS_HOST:-admin.nabd.plus}
fail() { echo "cf: FAIL $*"; exit 1; }
ok() { jq -e '.success == true' >/dev/null 2>&1; }
errs() { jq -r '[.errors[]?.message] | join("; ")' 2>/dev/null | cut -c1-200; }
J='application/json'

A=$(cf_curl "$API/zones/$Z" | jq -r '.result.account.id // empty')
[ -n "$A" ] || fail "cannot read the account id from the zone"
APPS=$(cf_curl "$API/accounts/$A/access/apps?per_page=100")
echo "$APPS" | ok || fail "access apps: $(echo "$APPS" | errs)"
APP=$(echo "$APPS" | jq -c --arg h "$HOST" '[.result[]? | select(.domain == $h or ([.self_hosted_domains[]?] | index($h)) or ([.destinations[]?.uri] | index($h)))][0] // empty')
[ -n "$APP" ] || fail "no Access application for $HOST"
APP_ID=$(echo "$APP" | jq -r .id)
IDPS() { cf_curl "$API/accounts/$A/access/identity_providers"; }
POLS() { cf_curl "$API/accounts/$A/access/apps/$APP_ID/policies"; }

# one line per policy: name, decision, rule types per list, and whether the owner's e-mail is one of the include rules
show() { # $1 before|after
  local idps app pols
  idps=$(IDPS); app=$(cf_curl "$API/accounts/$A/access/apps/$APP_ID"); pols=$(POLS)
  echo "cf: $1: logins on the account: $(echo "$idps" | jq -c '[.result[]?.type]')"
  echo "cf: $1: app allows logins: $(echo "$app" | jq -c --argjson i "$(echo "$idps" | jq -c '[.result[]? | {id, type}]')" \
    '(.result.allowed_idps // []) as $a | if ($a | length) == 0 then "all" else [$a[] as $x | ($i[] | select(.id == $x) | .type) // "unknown"] end')"
  echo "$pols" | jq -r --arg o "$OWNER" '.result[]? | "cf: \($ARGS.positional[0]): policy \"\(.name)\" \(.decision) reusable=\(.reusable // false) include=\([.include[]? | keys[0]]) require=\([.require[]? | keys[0]]) exclude=\([.exclude[]? | keys[0]]) owner_email_included=\([.include[]? | .email.email? // empty | ascii_downcase] | index($o | ascii_downcase) != null)"' --args "$1"
}
echo "cf: Access application for $HOST found"
show before

# ---------------------------------------------------------------- 2. One-time PIN login
OTP=$(IDPS | jq -r '[.result[]? | select(.type == "onetimepin") | .id][0] // empty')
if [ -z "$OTP" ]; then
  R=$(cf_curl -X POST -H "Content-Type: $J" "$API/accounts/$A/access/identity_providers" --data '{"name":"One-time PIN","type":"onetimepin","config":{}}')
  echo "$R" | ok || fail "one-time PIN login: $(echo "$R" | errs)"
  OTP=$(echo "$R" | jq -r .result.id)
  echo "cf: one-time PIN login added"
fi

# ---------------------------------------------------------------- 3. the app's login list
ALLOWED=$(cf_curl "$API/accounts/$A/access/apps/$APP_ID" | jq -c '.result.allowed_idps // []')
if [ "$(echo "$ALLOWED" | jq length)" -gt 0 ]; then
  WANT=$(IDPS | jq -c --argjson a "$ALLOWED" '($a + [.result[]? | select(.type == "onetimepin" or .type == "google" or .type == "google-apps") | .id]) | unique')
  if [ "$WANT" != "$(echo "$ALLOWED" | jq -c unique)" ]; then
    BODY=$(cf_curl "$API/accounts/$A/access/apps/$APP_ID" | jq -c --argjson w "$WANT" '.result | del(.id, .aud, .created_at, .updated_at) | .policies = [.policies[]? | {id, precedence}] | .allowed_idps = $w')
    R=$(cf_curl -X PUT -H "Content-Type: $J" "$API/accounts/$A/access/apps/$APP_ID" --data "$BODY")
    echo "$R" | ok || fail "app logins: $(echo "$R" | errs)"
    echo "cf: app login list extended with the one-time PIN and Google logins"
  fi
fi
[ -n "$(IDPS | jq -r '.result[]? | select(.type == "google" or .type == "google-apps") | .id')" ] \
  || echo "cf: no Google login on the account: the owner signs in with the e-mailed code (adding Google needs an OAuth client, an owner step)"

# ---------------------------------------------------------------- 1. the owner's e-mail in the Allow policy
P=$(POLS)
echo "$P" | ok || fail "policies: $(echo "$P" | errs)"
HAS=$(echo "$P" | jq --arg o "$OWNER" '[.result[]? | select(.decision == "allow") | .include[]? | .email.email? // empty | ascii_downcase] | index($o | ascii_downcase) != null')
if [ "$HAS" = true ]; then
  echo "cf: the owner's e-mail is already an include rule of an Allow policy"
else
  POL=$(echo "$P" | jq -c '[.result[]? | select(.decision == "allow")] | sort_by(.precedence // 0) | .[0] // empty')
  [ -n "$POL" ] || fail "the app has no Allow policy; not creating one without the owner"
  PID=$(echo "$POL" | jq -r .id)
  BODY=$(echo "$POL" | jq -c --arg o "$OWNER" '{name, decision, include: ((.include // []) + [{email: {email: $o}}]), exclude: (.exclude // []), require: (.require // [])}
    + (if .session_duration then {session_duration} else {} end) + (if .precedence then {precedence} else {} end)')
  if [ "$(echo "$POL" | jq -r '.reusable // false')" = true ]; then URL="$API/accounts/$A/access/policies/$PID"; else URL="$API/accounts/$A/access/apps/$APP_ID/policies/$PID"; fi
  R=$(cf_curl -X PUT -H "Content-Type: $J" "$URL" --data "$BODY")
  echo "$R" | ok || fail "policy update: $(echo "$R" | errs)"
  echo "cf: the owner's e-mail added as an include rule of policy \"$(echo "$POL" | jq -r .name)\""
fi

# ---------------------------------------------------------------- 4. a require rule that pins the login
PIN=$(POLS | jq -r '[.result[]? | select(.decision == "allow") | .require[]? | select(has("login_method"))] | length')
[ "$PIN" = 0 ] || echo "cf: BLOCKED an Allow policy requires one login method ($PIN rule(s)); the e-mailed code may still be refused. Not changed: the owner decides"

show after
HAS=$(POLS | jq --arg o "$OWNER" '[.result[]? | select(.decision == "allow") | .include[]? | .email.email? // empty | ascii_downcase] | index($o | ascii_downcase) != null')
OTPN=$(IDPS | jq '[.result[]? | select(.type == "onetimepin")] | length')
[ "$HAS" = true ] && [ "$OTPN" -ge 1 ] && [ "$PIN" = 0 ] && echo "cf: OK the owner can sign in to $HOST with the e-mailed code" || { echo "cf: FAIL see the lines above"; exit 1; }
