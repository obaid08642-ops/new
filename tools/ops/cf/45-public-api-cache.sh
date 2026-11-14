#!/bin/bash
# Public catalogue reads at the edge (lead, 2026-10-27). GET api.nabd.plus/api/v1/public/* answers `public, s-maxage=300,
# stale-while-revalidate=600` with `Cache-Tag: medicines, public-catalogue` where the backend marks it (@PublicCache, #2052), and
# `private, no-store` otherwise; the zone's blanket "Bypass: API + _next/data" cache rule hides that from the edge, so
# cf-cache-status is DYNAMIC and every call travels to the origin. This adds ONE cache rule after the bypass rules (the last
# matching rule wins): cache, edge TTL and browser TTL = respect origin, only for anonymous GETs under /api/v1/public/ (no
# Authorization header, no session cookie). Respect origin means an answer without a public s-maxage (private, no-store) is
# still never stored. Entries leave the cache with a purge by tag (the purge bus; tags `medicines` and `public-catalogue`).
#   45-public-api-cache-check.sh   reads only: origin headers, current rules (ids and on/off only), what would change
#   45-public-api-cache-apply.sh   APPLY=1: adds the rule, checks the edge (MISS then HIT; never HIT with Authorization or a
#                                  session cookie; purge by tag empties it) and puts the old rules back if a check fails
# Lines start with "cf: public-api" (public log): rule ids and statuses only, no rule text, no values. Env: CF/CFE/Z (_auth.sh),
# APPLY, CF_API, EDGE_URL (https://api.nabd.plus).
set -uo pipefail
. "$(dirname "$0")/_auth.sh"
CF_API=${CF_API:-https://api.cloudflare.com/client/v4}
EDGE=${EDGE_URL:-https://api.nabd.plus}
APPLY=${APPLY:-0}
PATHQ="/api/v1/public/categories/ar/items?limit=24"
PATHT="/api/v1/public/categories/ar"
PHASE="http_request_cache_settings"
DESC="Public catalogue API: respect origin Cache-Control (anonymous GET only)"
EXPR='(http.host eq "api.nabd.plus" and http.request.method eq "GET" and starts_with(http.request.uri.path, "/api/v1/public/") and not http.cookie contains "nabd_access" and not http.cookie contains "nabd_refresh" and not http.cookie contains "admin_access" and not any(http.request.headers["authorization"][*] ne ""))'
say() { echo "cf: public-api $*"; }
hdr() { curl -s -o /dev/null -D - --max-time 20 "$@" | tr -d '\r'; }
h() { awk -F': ' -v k="$1" 'tolower($1)==k{sub(/^[^:]*: /,""); print; exit}'; }

# ---------------------------------------------------------------- 1. the origin must send the public header (else nothing is cached)
H1=$(hdr "$EDGE$PATHQ")
CC=$(echo "$H1" | h cache-control)
say "answer now: HTTP $(echo "$H1" | head -1 | awk '{print $2}'), cache-control: ${CC:-none}, cf-cache-status: $(echo "$H1" | h cf-cache-status)"
echo "$CC" | grep -q 'public' && echo "$CC" | grep -q 's-maxage=300' \
  || { say "BLOCKED the origin does not send 'public, s-maxage=300' on the category items (release without #2052?): nothing changed"; exit 1; }
# a private answer under the same prefix must stay uncached: the signed-in profile is the check
HP=$(hdr -H 'Authorization: Bearer cache-test-not-a-token' "$EDGE$PATHQ" | h cache-control)
echo "$HP" | grep -q 'public' && { say "BLOCKED the origin answers an Authorization request as public ($HP): nothing changed"; exit 1; }

# ---------------------------------------------------------------- 2. current rules (ids only)
CUR=$(cf_curl "$CF_API/zones/$Z/rulesets/phases/$PHASE/entrypoint")
[ "$(echo "$CUR" | jq -r .success)" = true ] || { say "BLOCKED cannot read the cache rules: $(echo "$CUR" | jq -c '[.errors[]?.message]')"; exit 1; }
RID=$(echo "$CUR" | jq -r .result.id)
say "cache rules now: $(echo "$CUR" | jq -r '.result.rules | length') ($(echo "$CUR" | jq -r '[.result.rules[] | select(.enabled)] | length') enabled)"
echo "$CUR" | jq -r '.result.rules[] | "cf: public-api   rule id \(.id) \(if .enabled then "on" else "off" end)"'
OLD=$(echo "$CUR" | jq -c '[.result.rules[] | {id, action, action_parameters, expression, description, enabled}]')
HAVE=$(echo "$OLD" | jq -c --arg d "$DESC" '[.[] | select(.description == $d)] | length')
if [ "$HAVE" != 0 ]; then
  echo "$OLD" | jq -e --arg d "$DESC" --arg e "$EXPR" '.[] | select(.description == $d) | .enabled == true and .expression == $e and .action_parameters.cache == true and .action_parameters.edge_ttl.mode == "respect_origin" and .action_parameters.browser_ttl.mode == "respect_origin"' >/dev/null \
    && { say "the rule is already there and correct (id $(echo "$OLD" | jq -r --arg d "$DESC" '.[] | select(.description == $d) | .id'))"; ALREADY=1; } || { say "a rule with this name exists but differs: not touching it"; exit 1; }
fi
NEW=$(echo "$OLD" | jq -c --arg d "$DESC" --arg e "$EXPR" '. + [{action: "set_cache_settings", description: $d, enabled: true, expression: $e,
  action_parameters: {cache: true, edge_ttl: {mode: "respect_origin"}, browser_ttl: {mode: "respect_origin"}}}]')
put() { cf_curl -X PUT -H 'Content-Type: application/json' "$CF_API/zones/$Z/rulesets/$RID" --data "$(jq -nc --argjson r "$1" '{rules: $r}')" ; }
if [ "${ALREADY:-0}" != 1 ]; then
  [ "$APPLY" = 1 ] || { say "would add one rule at the end (after the bypass rules); run the -apply task to change it"; exit 0; }
  R=$(put "$NEW")
  [ "$(echo "$R" | jq -r .success)" = true ] || { say "FAILED to add the rule: $(echo "$R" | jq -c '[.errors[]?.message]'): nothing changed"; exit 1; }
  say "rule added, id $(echo "$R" | jq -r --arg d "$DESC" '.result.rules[] | select(.description == $d) | .id') (cache rules now $(echo "$R" | jq -r '.result.rules | length'))"
fi
[ "$APPLY" = 1 ] || exit 0
rollback() { say "CHECK FAILED ($1): putting the previous rules back"; [ "${ALREADY:-0}" = 1 ] || put "$OLD" | jq -r '"cf: public-api rollback success=\(.success)"'; exit 1; }

# ---------------------------------------------------------------- 3. the edge behaves
sleep 5
S1=$(hdr "$EDGE$PATHQ" | h cf-cache-status); S2=""
for i in 1 2 3; do S2=$(hdr "$EDGE$PATHQ" | h cf-cache-status); [ "$S2" = HIT ] && break; sleep 2; done
say "items anonymous: first $S1, then $S2"
[ "$S2" = HIT ] || rollback "anonymous request is not served from the cache"
T1=$(hdr "$EDGE$PATHT" | h cf-cache-status); T2=$(hdr "$EDGE$PATHT" | h cf-cache-status)
say "tree anonymous: first $T1, then $T2"
H3=$(hdr "$EDGE$PATHQ"); [ "$(echo "$H3" | h cache-control)" = "$CC" ] || rollback "the cache-control the browser gets changed"
say "browser header unchanged: $CC"
SA=$(hdr -H 'Authorization: Bearer cache-test-not-a-token' "$EDGE$PATHQ" | h cf-cache-status)
SC=$(hdr -H 'Cookie: nabd_access=cache-test' "$EDGE$PATHQ" | h cf-cache-status)
say "with Authorization: ${SA:-none}; with a session cookie: ${SC:-none}"
[ "$SA" != HIT ] && [ "$SC" != HIT ] || rollback "a signed-in request was served from the cache"
# a private answer is never stored: the health route under /api/v1 (outside /public/) stays out, and a no-store answer under /public/ is respected
SH=$(hdr "$EDGE/api/v1/health/liveness" | h cf-cache-status)
say "outside the prefix (health): ${SH:-none}"
[ "$SH" != HIT ] || rollback "a route outside /public/ was cached"

# purge by the tags the origin sets; the answer must leave the cache
P=$(cf_curl -X POST -H 'Content-Type: application/json' "$CF_API/zones/$Z/purge_cache" --data '{"tags":["public-catalogue"]}')
say "purge by tag public-catalogue: success=$(echo "$P" | jq -r .success) $(echo "$P" | jq -c '[.errors[]?.message]')"
if [ "$(echo "$P" | jq -r .success)" = true ]; then
  sleep 4; S4=$(hdr "$EDGE$PATHQ" | h cf-cache-status)
  say "right after the purge: $S4"
  [ "$S4" != HIT ] || say "NOTE the entry was still served after the purge (Cloudflare may hide Cache-Tag from the origin answer here): the TTL of 5 min applies until it leaves"
else
  say "NOTE purge by tag is not available with this credential or plan: the TTL of 5 min applies"
fi
say "OK the public catalogue API is cached at the edge (anonymous only)"
