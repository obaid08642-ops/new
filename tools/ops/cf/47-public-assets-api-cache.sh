#!/bin/bash
# Images and the wider public read-only API at the Cloudflare edge (owner, 2026-10-27: "cache everything public"). Two rules, added after the
# bypass rules (the last match wins), each only when its precondition holds:
#   1. IMAGES  cdn.nabd.plus: GET/HEAD, 200 answers are kept 30 days at the edge and 1 day in the browser, errors are never kept. The objects
#              are product, doctor, insurance and fetal-week pictures; a replaced picture is purged by URL (Caching > Purge) or waits at most the TTL.
#              (Cloudinary pictures are served from res.cloudinary.com, Cloudinary's own CDN: not ours to configure here.)
#   2. PUBLIC READ API  api.nabd.plus GET under the explicit prefixes below (doctors, labs, radiology, care, home-care, catalogs, locations): respect
#              origin, anonymous only (no Authorization, no session cookie). The origin marks only @PublicCache routes `public` (lists 60-300 s, doctor
#              slots 20 s); every other route under those prefixes (appointments, orders, anything signed in) is `private, no-store` and is never stored.
#              The rule is added only when the origin already sends `public` for the doctors list (the release with the doctors cache headers is deployed).
# 45-public-api-cache covers /api/v1/public/ (category items, tree). Nothing else under /api is ever cached.
#   47-public-assets-api-cache-check.sh   reads only        47-public-assets-api-cache-apply.sh   APPLY=1, with checks and rollback
# Env: CF/CFE/Z (_auth.sh), APPLY, CF_API, EDGE_URL (https://api.nabd.plus), CDN_URL (https://cdn.nabd.plus), IMG_URL (a picture on the CDN; default: found in a public answer).
set -uo pipefail
HERE=$(dirname "$0")
. "$HERE/_auth.sh"
TAG=public-assets
. "$HERE/_rules.sh"
EDGE=${EDGE_URL:-https://api.nabd.plus}
CDN=${CDN_URL:-https://cdn.nabd.plus}
API_PREFIXES="/api/v1/doctors /api/v1/labs/ /api/v1/radiology/ /api/v1/care/ /api/v1/home-care/ /api/v1/catalogs /api/v1/locations/"
DOCTORS="/api/v1/doctors?limit=5"
say() { rsay "$@"; }

IMG_DESC="Images CDN: edge 30 days for 200, browser 1 day"
IMG_EXPR='(http.host eq "cdn.nabd.plus" and (http.request.method eq "GET" or http.request.method eq "HEAD") and not http.cookie contains "nabd_access=")'
IMG_PARAMS='{"cache":true,"edge_ttl":{"mode":"override_origin","default":2592000,"status_code_ttl":[{"status_code":200,"value":2592000},{"status_code_range":{"from":400,"to":599},"value":-1}]},"browser_ttl":{"mode":"override_origin","default":86400}}'

PFX=""; for p in $API_PREFIXES; do PFX="$PFX${PFX:+ or }starts_with(http.request.uri.path, \"$p\")"; done
API_DESC="Public read API (doctors, labs, radiology, care, home-care, catalogs, locations): respect origin (anonymous GET only)"
API_EXPR="(http.host eq \"api.nabd.plus\" and http.request.method eq \"GET\" and ($PFX) and not http.cookie contains \"nabd_access=\" and not http.cookie contains \"nabd_refresh=\" and not http.cookie contains \"admin_access=\" and not any(http.request.headers[\"authorization\"][*] ne \"\"))"
API_PARAMS='{"cache":true,"edge_ttl":{"mode":"respect_origin"},"browser_ttl":{"mode":"respect_origin"}}'
[ "${PRINT_EXPRESSION:-0}" = 1 ] && { echo "$API_EXPR"; exit 0; }

# ---------------------------------------------------------------- 1. preconditions
IMG=${IMG_URL:-$(curl -s --max-time 20 "$EDGE/api/v1/public/categories/ar/items?limit=24" | grep -oE 'https://cdn\.nabd\.plus/[^"\\ ]+\.(jpg|jpeg|png|webp)' | head -1)}
if [ -n "$IMG" ]; then
  HI=$(hdr "$IMG"); say "image now: HTTP $(echo "$HI" | head -1 | awk '{print $2}'), cache-control: $(echo "$HI" | h cache-control), cf-cache-status: $(echo "$HI" | h cf-cache-status), age: $(echo "$HI" | h age)"
else
  say "NOTE no CDN picture found in a public answer (set IMG_URL): the image rule is added without a live check"
fi
HD=$(hdr "$EDGE$DOCTORS"); CCD=$(echo "$HD" | h cache-control)
say "doctors list now: HTTP $(echo "$HD" | head -1 | awk '{print $2}'), cache-control: ${CCD:-none}, cf-cache-status: $(echo "$HD" | h cf-cache-status)"
API_OK=0; echo "$CCD" | grep -q 'public' && echo "$CCD" | grep -q 's-maxage=' && API_OK=1
HA=$(hdr -H 'Authorization: Bearer cache-test-not-a-token' "$EDGE$DOCTORS" | h cache-control)
echo "$HA" | grep -q 'public' && { say "BLOCKED the origin answers an Authorization request as public ($HA): nothing changed"; exit 1; }
HM=$(hdr "$EDGE/api/v1/doctors/appointments/mine" | h cache-control)
echo "$HM" | grep -q 'public' && { say "BLOCKED a signed-in route is public at the origin ($HM): nothing changed"; exit 1; }
[ "$API_OK" = 1 ] || say "NOTE the origin does not send 'public, s-maxage' for the doctors list yet (release not deployed): the API rule is NOT added in this run"

# ---------------------------------------------------------------- 2. rules
rules_load
rules_want "$IMG_DESC" "$IMG_EXPR" "$IMG_PARAMS"
[ "$API_OK" = 1 ] && rules_want "$API_DESC" "$API_EXPR" "$API_PARAMS"
rules_commit
[ "$APPLY" = 1 ] || exit 0

# ---------------------------------------------------------------- 3. the edge behaves
sleep 5
if [ -n "$IMG" ]; then
  hdr "$IMG" >/dev/null; S2=""; for i in 1 2 3; do S2=$(hdr "$IMG" | h cf-cache-status); [ "$S2" = HIT ] && break; sleep 2; done
  say "image: then $S2 (hit ratio $(hit_ratio 10 "$IMG"))"
  [ "$S2" = HIT ] || rules_rollback "the picture is not served from the cache"
  HH=$(hdr "$IMG"); BC=$(echo "$HH" | h cache-control); say "image cache-control the browser gets: ${BC:-none}"
fi
if [ "$API_OK" = 1 ]; then
  hdr "$EDGE$DOCTORS" >/dev/null; S2=""; for i in 1 2 3; do S2=$(hdr "$EDGE$DOCTORS" | h cf-cache-status); [ "$S2" = HIT ] && break; sleep 2; done
  say "doctors list: then $S2 (hit ratio $(hit_ratio 10 "$EDGE$DOCTORS"))"
  [ "$S2" = HIT ] || rules_rollback "the doctors list is not served from the cache"
  SA=$(hdr -H 'Authorization: Bearer cache-test-not-a-token' "$EDGE$DOCTORS" | h cf-cache-status)
  SC=$(hdr -H 'Cookie: nabd_access=cache-test' "$EDGE$DOCTORS" | h cf-cache-status)
  say "doctors list with Authorization: ${SA:-none}; with a session cookie: ${SC:-none}"
  [ "$SA" != HIT ] && [ "$SC" != HIT ] || rules_rollback "a signed-in request was served from the cache"
  for priv in /api/v1/doctors/appointments/mine /api/v1/auth/me /api/v1/users/me; do
    hdr "$EDGE$priv" >/dev/null; S=$(hdr "$EDGE$priv" | h cf-cache-status); say "private route $priv: ${S:-none}"
    [ "$S" != HIT ] || rules_rollback "$priv was served from the cache"
  done
fi
PR=$(cf_curl -X POST -H 'Content-Type: application/json' "$CF_API/zones/$Z/purge_cache" --data '{"tags":["doctors"]}')
say "purge by tag doctors: success=$(echo "$PR" | jq -r .success) $(echo "$PR" | jq -c '[.errors[]?.message]')"
say "OK images and the public read API are cached at the edge"
