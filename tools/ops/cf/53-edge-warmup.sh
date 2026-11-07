#!/bin/bash
# Keeps the Cloudflare cache warm for the public pages (owner, 2026-11-02): a data centre with no visitors holds nothing, so when the origin is
# down it has nothing to serve. This requests the home page of every locale and a rotating slice of the public sitemap URLs as an anonymous
# visitor, so the upper tier of Tiered Cache (52-edge-resilience) always holds a copy, and prints COUNTS only (status and cf-cache-status).
# Only URLs the cache rule of 46-public-html-cache would keep are requested (home, /c /p /doctor /doctors /articles, the doctors list); anything
# else in a sitemap is skipped. Reads only; it changes nothing at Cloudflare or the origin. Run every 15 minutes by .github/workflows/edge-warmup.yml.
# Env: SITE_URL (https://nabd.plus), MAX_URLS (300 per run), PARALLEL (6), SITEMAP_LIMIT (sitemaps read per run, 12).
# Exit 1 when the site answers fewer than MIN_OK_PERCENT (50) of the requests with 2xx, so a down origin shows as a red run.
set -uo pipefail
SITE=${SITE_URL:-https://nabd.plus}
MAX=${MAX_URLS:-300}
PAR=${PARALLEL:-6}
SMAX=${SITEMAP_LIMIT:-12}
MIN_OK=${MIN_OK_PERCENT:-50}
LOCALES="ar en ur hi bn fil"
say() { echo "edge-warmup: $*"; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

locs() { grep -oE '<loc>[^<]+</loc>' | sed -E 's#</?loc>##g'; }
host_re=$(printf '%s' "$SITE" | sed -E 's#https?://##; s#\.#\\.#g')
eligible='^https?://(www\.)?'"$host_re"'/(ar|en|ur|hi|bn|fil)(/?$|/(c|p|doctor|doctors|articles)(/|$)|/consultations/doctors/?$)'

: > "$TMP/urls"
for l in $LOCALES; do echo "$SITE/$l" >> "$TMP/urls"; echo "$SITE/$l/consultations/doctors" >> "$TMP/urls"; done

curl -s --max-time 30 "$SITE/sitemap.xml" | locs > "$TMP/index" || true
say "sitemap index: $(wc -l < "$TMP/index" | tr -d ' ') sitemap(s)"
# a rotating window over the sitemaps, so successive runs cover different ones
N=$(wc -l < "$TMP/index" | tr -d ' ')
if [ "$N" -gt 0 ]; then
  START=$(( ($(date +%s) / 900 * SMAX) % N ))
  { tail -n +$((START + 1)) "$TMP/index"; head -n "$START" "$TMP/index"; } | head -n "$SMAX" > "$TMP/pick"
  while read -r sm; do
    curl -s --max-time 30 "$sm" | locs | grep -E "$eligible" >> "$TMP/urls" || true
  done < "$TMP/pick"
fi
sort -u "$TMP/urls" | head -n "$MAX" > "$TMP/list"
TOTAL=$(wc -l < "$TMP/list" | tr -d ' ')
say "requesting $TOTAL url(s)"

one() { curl -s -o /dev/null --max-time 40 -D - -w 'code=%{http_code}\n' -H 'Accept-Encoding: gzip' "$1" | tr -d '\r' \
  | awk 'tolower($1)=="cf-cache-status:"{c=$2} /^code=/{s=substr($0,6)} END{print s, (c==""?"none":c)}'; }
export -f one
xargs -P "$PAR" -I{} bash -c 'one "$1"' _ {} < "$TMP/list" > "$TMP/res"

OK=$(awk '$1 ~ /^2/' "$TMP/res" | wc -l | tr -d ' ')
say "answered 2xx: $OK of $TOTAL"
say "status codes: $(awk '{print $1}' "$TMP/res" | sort | uniq -c | awk '{printf "%s=%s ", $2, $1}')"
say "cf-cache-status: $(awk '{print $2}' "$TMP/res" | sort | uniq -c | awk '{printf "%s=%s ", $2, $1}')"
[ "$TOTAL" -gt 0 ] || { say "FAIL no url to request"; exit 1; }
[ $(( OK * 100 / TOTAL )) -ge "$MIN_OK" ] || { say "FAIL fewer than $MIN_OK% answered 2xx: the origin or the edge is down"; exit 1; }
