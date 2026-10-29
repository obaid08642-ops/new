#!/bin/bash
# Read-only. Where does the time of a cached public answer go? (lead, 2026-10-27: an nginx HIT still took 0.45 s from outside.)
# Times the same GETs on the server itself, through nginx on 127.0.0.1 (no Cloudflare, no internet, no TLS to a client far away) and, for
# comparison, straight to the backend container, then prints p50/p95 of the total and of the time to first byte:
#   1. the cached category items (x-cache-status HIT expected)      3. the liveness route (a few bytes, never cached)
#   2. the same with `Accept-Encoding: gzip` (what a browser sends)  4. the same items straight to the backend (no nginx cache)
# If 1-3 are a few milliseconds, the 0.45 s seen from outside is the path (client -> Cloudflare -> origin), not nginx, buffering or the
# size of the JSON; if 1 is slow and 4 is fast, the nginx cache or its lock is the cost. Also prints the sizes (plain and gzip) and the
# names/values of the nginx settings that matter (gzip, keepalive, proxy_buffering, proxy_cache): no secret is read or printed.
# Env: OPS_SAMPLES (20), OPS_BACKEND_URL (http://127.0.0.1:3000 inside the docker host: the backend container's published/internal address).
set -u
N=${OPS_SAMPLES:-20}
H='Host: api.nabd.plus'
ITEMS='/api/v1/public/categories/ar/items?limit=24'
LIVE='/api/v1/health/liveness'
BACKEND=${OPS_BACKEND_URL:-http://nabdah-backend:3000}
DK="sudo -n docker"
echo "## api-latency"
say() { echo "status: api-latency: $*"; }

# percentile (nearest rank) of the numbers on stdin, in ms: pct <p>
pct() { sort -n | awk -v p="$1" '{a[NR]=$1} END {if (!NR) {print "-"; exit} i=int(NR*p/100+0.999); if (i<1) i=1; if (i>NR) i=NR; printf "%.0f", a[i]}'; }
# usage: sample <label> <curl args...>   -> p50/p95 of total and ttfb in ms
sample() {
  local label=$1; shift
  local out; out=$(for _ in $(seq "$N"); do curl -sk -o /dev/null --max-time 15 -w '%{time_starttransfer} %{time_total}\n' "$@" 2>/dev/null; done)
  [ -n "$out" ] || { say "$label: no answer"; return; }
  local t a; t=$(echo "$out" | awk '{print $1*1000}'); a=$(echo "$out" | awk '{print $2*1000}')
  say "$(printf '%-30s ttfb p50=%s p95=%s ms  total p50=%s p95=%s ms  (n=%s)' "$label" "$(echo "$t" | pct 50)" "$(echo "$t" | pct 95)" "$(echo "$a" | pct 50)" "$(echo "$a" | pct 95)" "$(echo "$out" | wc -l)")"
}
hdr() { curl -sk -o /dev/null -D - --max-time 15 "$@" 2>/dev/null | tr -d '\r'; }
hv() { awk -F': ' -v k="$1" 'tolower($1)==k{sub(/^[^:]*: /,""); print; exit}'; }

curl -sk -o /dev/null --max-time 15 -H "$H" "https://127.0.0.1$ITEMS"        # warm the nginx entry
H1=$(hdr -H "$H" "https://127.0.0.1$ITEMS")
say "items via nginx: HTTP $(echo "$H1" | head -1 | awk '{print $2}'), x-cache-status: $(echo "$H1" | hv x-cache-status), cache-control: $(echo "$H1" | hv cache-control)"
PLAIN=$(curl -sk --max-time 15 -H "$H" "https://127.0.0.1$ITEMS" | wc -c)
GZ=$(curl -sk --max-time 15 -H "$H" -H 'Accept-Encoding: gzip' "https://127.0.0.1$ITEMS" | wc -c)
say "items size: $PLAIN bytes plain, $GZ bytes gzip"

sample "1 items via nginx (HIT)" -H "$H" "https://127.0.0.1$ITEMS"
sample "2 items via nginx, gzip" -H "$H" -H 'Accept-Encoding: gzip' "https://127.0.0.1$ITEMS"
sample "3 liveness via nginx" -H "$H" "https://127.0.0.1$LIVE"
if $DK exec nabdah-backend sh -c 'command -v wget >/dev/null || command -v curl >/dev/null' >/dev/null 2>&1; then
  OUT=$(for _ in $(seq "$N"); do $DK exec nabdah-backend sh -c "s=\$(date +%s%N); (wget -qO- 'http://127.0.0.1:3000$ITEMS' || curl -s 'http://127.0.0.1:3000$ITEMS') >/dev/null; e=\$(date +%s%N); echo \$(( (e - s) / 1000000 ))" 2>/dev/null; done)
  say "4 items inside the backend       total p50=$(echo "$OUT" | pct 50) p95=$(echo "$OUT" | pct 95) ms (includes the process start of wget/curl)"
else
  say "4 items inside the backend: no wget/curl in the container, skipped"
fi

# the settings that decide buffering, compression and connection reuse (names and values only)
$DK exec nabdah-nginx nginx -T 2>/dev/null | grep -E '^\s*(gzip|gzip_comp_level|gzip_min_length|gzip_types|gzip_proxied|keepalive|keepalive_requests|keepalive_timeout|proxy_buffering|proxy_buffers|proxy_cache|proxy_cache_lock|proxy_cache_valid|proxy_http_version|http2|sendfile|tcp_nodelay|tcp_nopush)\b' \
  | sed 's/^\s*//' | sort -u | cut -c1-120 | sed 's/^/status: api-latency: nginx: /'
say "done"
