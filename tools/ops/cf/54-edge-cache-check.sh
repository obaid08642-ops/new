#!/bin/bash
# Is the Cloudflare edge really keeping the public pages and the public API? (lead, 2026-11-03: a measurement showed `cf-cache-status: DYNAMIC`.)
# READS ONLY, anonymous GET, no credential. For each of 10 sample URLs it asks TWICE and prints the cache-control, whether the answer carries a Set-Cookie,
# and cf-cache-status of both requests. Expect MISS or EXPIRED, then HIT within 4 asks (a refresh at s-maxage or another cache server can cost one non-HIT). A URL that answers DYNAMIC / BYPASS twice, or with a Set-Cookie,
# is NOT being kept: the line says why (private cache-control, a cookie, or a rule that does not match). Exit 1 when fewer than MIN_HIT_PERCENT (default 80)
# of the sampled URLs reach HIT on the second request.
# Env: SITE_URL (https://nabd.plus), API_URL (https://api.nabd.plus), MIN_HIT_PERCENT, SAMPLE_PAUSE (seconds between the two asks, default 2).
set -uo pipefail
SITE=${SITE_URL:-https://nabd.plus}
API=${API_URL:-https://api.nabd.plus}
MIN=${MIN_HIT_PERCENT:-80}
PAUSE=${SAMPLE_PAUSE:-2}
say() { echo "cf: edge-cache-check $*"; }
URLS="$SITE/ar $SITE/en $SITE/ar/c $SITE/ar/consultations/doctors $SITE/ar/articles $API/api/v1/catalogs/specialties $API/api/v1/doctors?limit=5 $API/api/v1/public/categories/ar/items?limit=12 $API/api/v1/locations/cities $API/api/v1/catalogs"
ask() { curl -s -o /dev/null -m25 -D - -H 'Accept-Encoding: gzip' "$1" | tr -d '\r'; }
hv() { awk -v n="$2" 'tolower($1)==tolower(n) ":" {sub(/^[^:]*: */,""); print; exit}' <<<"$1"; }
total=0; hits=0; hits2=0
for u in $URLS; do
  total=$((total + 1))
  # Ask up to 4 times: a stored copy that is refreshed at its s-maxage (EXPIRED/REVALIDATED/UPDATING) or served by another cache server of the same
  # data centre (MISS once) is still a kept copy; a URL that never reaches HIT in 4 asks is not.
  seq=""; h=""; got=0
  for i in 1 2 3 4; do
    [ "$i" -gt 1 ] && sleep "$PAUSE"
    h=$(ask "$u"); st=$(hv "$h" cf-cache-status); seq="$seq${seq:+,}${st:-none}"
    [ "$i" = 2 ] && [ "$st" = HIT ] && hits2=$((hits2 + 1))
    if [ "$st" = HIT ] && [ "$i" -ge 2 ]; then got=1; break; fi
  done
  code=$(awk 'NR==1{print $2}' <<<"$h"); cc=$(hv "$h" cache-control); ck=$([ -n "$(hv "$h" set-cookie)" ] && echo yes || echo no)
  why=""
  if [ "$got" = 1 ]; then hits=$((hits + 1))
  else
    case "$cc" in *private*|*no-store*|*no-cache*) why="origin says private/no-store: $cc" ;; esac
    [ "$ck" = yes ] && why="${why:+$why; }answer carries a Set-Cookie (a shared cache will not keep it)"
    [ -z "$why" ] && why="origin cache-control is shareable (${cc:-none}) but the edge did not keep it: the Cloudflare cache rule does not match this URL"
  fi
  say "$u -> HTTP ${code:-none}, asks=$seq, set-cookie=$ck${why:+ | NOT KEPT: $why}"
done
pct=$(( hits * 100 / total ))
say "HIT within 4 asks: $hits of $total ($pct%); HIT on the second ask: $hits2 of $total"
[ "$pct" -ge "$MIN" ] || { say "FAIL below $MIN%: the edge is not keeping the public pages and API"; exit 1; }
