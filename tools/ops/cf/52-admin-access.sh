#!/bin/bash
# R13: Cloudflare Access (Zero Trust) in front of the admin dashboard UI. Only the people named in ACCESS_ALLOW_EMAILS can even load admin.nabd.plus; the passkey login of the
# dashboard stays on top (two independent locks). NOT covered: the admin API on api.nabd.plus (a browser cannot do the Access login redirect inside an XHR); see
# docs/platform/R13-admin-hardening.md for what that needs.
#   52-admin-access-check.sh   reads only: whether a Zero Trust organisation exists, whether the Access application exists, what an unauthenticated visitor gets now, and what would be created
#   52-admin-access-apply.sh   APPLY=1: creates the application (self-hosted, session 8h) and ONE allow policy for the listed emails, then proves that an unauthenticated request no longer reaches the
#                              dashboard (redirect to the Access login or 403); if it still answers 200, the application is deleted again.
# Env: CF/CFE/Z (_auth.sh), APPLY, CF_API, ADMIN_HOST (admin.nabd.plus), ACCESS_ALLOW_EMAILS (comma separated; counts are printed, never the addresses), ACCESS_SESSION (8h), ACCESS_APP_NAME.
# Refuses to create an application with an empty allow list (it would lock everybody out) and never touches an application it did not create (matched by name).
set -uo pipefail
HERE=$(dirname "$0")
. "$HERE/_auth.sh"
TAG=admin-access
CF_API=${CF_API:-https://api.cloudflare.com/client/v4}
APPLY=${APPLY:-0}
HOST=${ADMIN_HOST:-admin.nabd.plus}
NAME=${ACCESS_APP_NAME:-nabd-admin-ui}
SESSION=${ACCESS_SESSION:-8h}
say() { echo "cf: $TAG $*"; }
ok() { [ "$(echo "$1" | jq -r .success)" = true ]; }
err() { echo "$1" | jq -c '[.errors[]?.message]'; }

cf_verify | sed 's/^/cf: '"$TAG"' credential: /'
Z_INFO=$(cf_curl "$CF_API/zones/$Z")
ok "$Z_INFO" || { say "BLOCKED cannot read the zone: $(err "$Z_INFO"): nothing changed"; exit 1; }
ACC=$(echo "$Z_INFO" | jq -r '.result.account.id')
ORG=$(cf_curl "$CF_API/accounts/$ACC/access/organizations")
if ! ok "$ORG" || [ -z "$(echo "$ORG" | jq -r '.result.auth_domain // empty')" ]; then
  say "BLOCKED no Zero Trust organisation on this account (or the token cannot read it): the owner creates it once in the Cloudflare dashboard (Zero Trust, choose a team name); nothing changed"; exit 1
fi
say "Zero Trust team domain: $(echo "$ORG" | jq -r '.result.auth_domain')"
APPS=$(cf_curl "$CF_API/accounts/$ACC/access/apps")
ok "$APPS" || { say "BLOCKED cannot list Access applications: $(err "$APPS"): nothing changed"; exit 1; }
EXIST=$(echo "$APPS" | jq -r --arg n "$NAME" '[.result[]? | select(.name == $n)][0].id // empty')
now() { curl -s -o /dev/null -w '%{http_code}' --max-time 25 "https://$HOST/"; }
say "GET https://$HOST/ with no login now: HTTP $(now)"
EMAILS=$(echo "${ACCESS_ALLOW_EMAILS:-}" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | grep -E '^[^@ ]+@[^@ ]+\.[^@ ]+$' | sort -u)
N=$(echo -n "$EMAILS" | grep -c . || true)
if [ -n "$EXIST" ]; then say "application '$NAME' already exists (id $EXIST): nothing to create"; exit 0; fi
[ "$N" -gt 0 ] || { say "BLOCKED ACCESS_ALLOW_EMAILS has no valid address: creating the application would lock everyone out; nothing changed"; exit 1; }
[ "$APPLY" = 1 ] || { say "would create application '$NAME' for https://$HOST (session $SESSION) with one allow policy for $N address(es); run the -apply task to create it"; exit 0; }

APP=$(cf_curl -X POST -H 'Content-Type: application/json' "$CF_API/accounts/$ACC/access/apps" \
  --data "$(jq -nc --arg n "$NAME" --arg d "$HOST" --arg s "$SESSION" '{name: $n, domain: $d, type: "self_hosted", session_duration: $s, app_launcher_visible: false, http_only_cookie_attribute: true, same_site_cookie_attribute: "lax"}')")
ok "$APP" || { say "FAILED to create the application: $(err "$APP"): nothing changed"; exit 1; }
ID=$(echo "$APP" | jq -r '.result.id')
INC=$(echo "$EMAILS" | jq -R '{email: {email: .}}' | jq -sc .)
POL=$(cf_curl -X POST -H 'Content-Type: application/json' "$CF_API/accounts/$ACC/access/apps/$ID/policies" \
  --data "$(jq -nc --argjson i "$INC" '{name: "nabd-admin-allow", decision: "allow", precedence: 1, include: $i}')")
rollback() {
  say "CHECK FAILED ($1): deleting the application again"
  local d; d=$(cf_curl -X DELETE "$CF_API/accounts/$ACC/access/apps/$ID"); say "rollback success=$(echo "$d" | jq -r .success)"; exit 1
}
ok "$POL" || rollback "the allow policy was refused: $(err "$POL")"
# proof: an unauthenticated visitor must not get the dashboard (the edge takes a few seconds to learn the application)
OK=0
for i in 1 2 3 4 5 6; do
  sleep 5; code=$(now)
  case "$code" in 302|401|403) OK=1; break ;; esac
done
say "GET https://$HOST/ with no login AFTER: HTTP $code"
[ "$OK" = 1 ] || rollback "an unauthenticated request still gets HTTP $code"
say "OK Access protects https://$HOST for $N address(es); session $SESSION; the dashboard's own passkey login is unchanged"
