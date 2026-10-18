#!/bin/bash
# Search suggest at the edge (owner/reviewer, 2026-10-18). GET api.nabd.plus/api/v1/search/suggest answers
# `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` and `Cache-Tag: search` (backend @PublicCache); the
# zone's blanket "Bypass: API + _next/data" cache rule hides that from the edge. This adds ONE cache rule after the
# bypass rules (the last matching rule wins): cache, edge TTL and browser TTL = respect origin, only for anonymous GETs
# of that path (no Authorization header, no session cookie). Entries leave the cache with a purge by tag `search`
# (the purge bus, backend/src/common/purge-bus.ts, needs its own Cache Purge token on the server).
#   43-search-suggest-cache-check.sh   reads only: origin headers, current rules, what would change
#   43-search-suggest-cache-apply.sh   APPLY=1: adds the rule, checks the edge (MISS then HIT; never HIT with Authorization or a
#                                      session cookie; purge by tag search empties it) and puts the old rules back if a check fails
# Lines start with "cf: suggest" (public log). Env: CF/CFE/Z (_auth.sh), APPLY, CF_API, EDGE_URL (https://api.nabd.plus).
set -uo pipefail
. "$(dirname "$0")/_auth.sh"
CF_API=${CF_API:-https://api.cloudflare.com/client/v4}
EDGE=${EDGE_URL:-https://api.nabd.plus}
APPLY=${APPLY:-0}
PATHQ="/api/v1/search/suggest?q=par&locale=ar"
PHASE="http_request_cache_settings"
DESC="Search suggest: respect origin Cache-Control (5 min browser, 1 h edge)"
EXPR='(http.host eq "api.nabd.plus" and http.request.method eq "GET" and http.request.uri.path eq "/api/v1/search/suggest" and not http.cookie contains "nabd_access" and not http.cookie contains "nabd_refresh" and not http.cookie contains "admin_access" and not any(http.request.headers["authorization"][*] ne ""))'
say() { echo "cf: suggest $*"; }
hdr() { curl -s -o /dev/null -D - --max-time 20 "$@" | tr -d '\r'; }
h() { awk -F': ' -v k="$1" 'tolower($1)==k{sub(/^[^:]*: /,""); print; exit}'; }

# ---------------------------------------------------------------- 1. the origin must send the public header (else nothing is cached)
H1=$(hdr "$EDGE$PATHQ")
CC=$(echo "$H1" | h cache-control); TAG=$(echo "$H1" | h cache-tag)
say "answer now: HTTP $(echo "$H1" | head -1 | awk '{print $2}'), cache-control: ${CC:-none}, cf-cache-status: $(echo "$H1" | h cf-cache-status)"
echo "$CC" | grep -q 'public' && echo "$CC" | grep -q 'max-age=300' && echo "$CC" | grep -q 's-maxage=3600' \
  || { say "BLOCKED the origin does not send 'public, max-age=300, s-maxage=3600' (production runs an older build?): nothing changed"; exit 1; }
# the cache tag is removed by Cloudflare before the answer reaches us, so a missing tag here is expected on the edge
[ -n "$TAG" ] && say "cache-tag visible: $TAG"

# ---------------------------------------------------------------- 2. current rules
CUR=$(cf_curl "$CF_API/zones/$Z/rulesets/phases/$PHASE/entrypoint")
[ "$(echo "$CUR" | jq -r .success)" = true ] || { say "BLOCKED cannot read the cache rules: $(echo "$CUR" | jq -c '[.errors[]?.message]')"; exit 1; }
RID=$(echo "$CUR" | jq -r .result.id)
say "cache rules now: $(echo "$CUR" | jq -r '.result.rules | length') ($(echo "$CUR" | jq -r '[.result.rules[] | select(.enabled)] | length') enabled)"
echo "$CUR" | jq -r '.result.rules[] | "cf: suggest   rule \(if .enabled then "on " else "off" end) \(.description)"'
OLD=$(echo "$CUR" | jq -c '[.result.rules[] | {id, action, action_parameters, expression, description, enabled}]')
HAVE=$(echo "$OLD" | jq -c --arg d "$DESC" '[.[] | select(.description == $d)] | length')
if [ "$HAVE" != 0 ]; then
  echo "$OLD" | jq -e --arg d "$DESC" --arg e "$EXPR" '.[] | select(.description == $d) | .enabled == true and .expression == $e and .action_parameters.cache == true and .action_parameters.edge_ttl.mode == "respect_origin" and .action_parameters.browser_ttl.mode == "respect_origin"' >/dev/null \
    && { say "the rule is already there and correct"; ALREADY=1; } || { say "a rule with this name exists but differs: not touching it"; exit 1; }
fi
NEW=$(echo "$OLD" | jq -c --arg d "$DESC" --arg e "$EXPR" '. + [{action: "set_cache_settings", description: $d, enabled: true, expression: $e,
  action_parameters: {cache: true, edge_ttl: {mode: "respect_origin"}, browser_ttl: {mode: "respect_origin"}}}]')
if [ "${ALREADY:-0}" != 1 ]; then
  [ "$APPLY" = 1 ] || { say "would add one rule at the end (after the bypass rules); run the -apply task to change it"; exit 0; }
  put() { cf_curl -X PUT -H 'Content-Type: application/json' "$CF_API/zones/$Z/rulesets/$RID" --data "$(jq -nc --argjson r "$1" '{rules: $r}')" ; }
  R=$(put "$NEW")
  [ "$(echo "$R" | jq -r .success)" = true ] || { say "FAILED to add the rule: $(echo "$R" | jq -c '[.errors[]?.message]'): nothing changed"; exit 1; }
  say "rule added (cache rules now $(echo "$R" | jq -r '.result.rules | length'))"
fi
[ "$APPLY" = 1 ] || exit 0
put() { cf_curl -X PUT -H 'Content-Type: application/json' "$CF_API/zones/$Z/rulesets/$RID" --data "$(jq -nc --argjson r "$1" '{rules: $r}')" ; }
rollback() { say "CHECK FAILED ($1): putting the previous rules back"; [ "${ALREADY:-0}" = 1 ] || put "$OLD" | jq -r '"cf: suggest rollback success=\(.success)"'; exit 1; }

# ---------------------------------------------------------------- 3. the edge behaves
sleep 5
S1=$(hdr "$EDGE$PATHQ" | h cf-cache-status); S2=""
for i in 1 2 3; do S2=$(hdr "$EDGE$PATHQ" | h cf-cache-status); [ "$S2" = HIT ] && break; sleep 2; done
say "anonymous: first $S1, then $S2"
[ "$S2" = HIT ] || rollback "anonymous request is not served from the cache"
H3=$(hdr "$EDGE$PATHQ"); [ "$(echo "$H3" | h cache-control)" = "$CC" ] || rollback "the cache-control the browser gets changed"
say "browser header unchanged: $CC"
SA=$(hdr -H 'Authorization: Bearer cache-test-not-a-token' "$EDGE$PATHQ" | h cf-cache-status)
SC=$(hdr -H 'Cookie: nabd_access=cache-test' "$EDGE$PATHQ" | h cf-cache-status)
say "with Authorization: ${SA:-none}; with a session cookie: ${SC:-none}"
[ "$SA" != HIT ] && [ "$SC" != HIT ] || rollback "a signed-in request was served from the cache"

# purge by the tag the origin sets; the answer must leave the cache
P=$(cf_curl -X POST -H 'Content-Type: application/json' "$CF_API/zones/$Z/purge_cache" --data '{"tags":["search"]}')
say "purge by tag search: success=$(echo "$P" | jq -r .success) $(echo "$P" | jq -c '[.errors[]?.message]')"
if [ "$(echo "$P" | jq -r .success)" = true ]; then
  sleep 4; S4=$(hdr "$EDGE$PATHQ" | h cf-cache-status)
  say "right after the purge: $S4"
  [ "$S4" != HIT ] || say "NOTE the entry was still served after the purge (the origin may not send Cache-Tag: search yet): the TTL of 1 h applies until it does"
else
  say "NOTE purge by tag is not available with this credential or plan: the TTL of 1 h applies"
fi
say "OK suggest is cached at the edge (anonymous only)"
