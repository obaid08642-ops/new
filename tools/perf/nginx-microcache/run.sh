#!/usr/bin/env bash
# P14.11 check: the API micro-cache (real snippet + real skip map) in nginx:1.27 in front of a counting stub.
#  1. 1000 concurrent identical public requests reach the backend at most twice.
#  2. Requests with Authorization or a cookie are never stored nor served from the cache, so no one gets another's answer.
#  3. Private answers (Cache-Control: private, no-store) are never stored, even without credentials.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
HERE="$ROOT/tools/perf/nginx-microcache"
WORK=$(mktemp -d); chmod 755 "$WORK"
NAME=nabd-ngx-microcache
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; kill "${STUB:-0}" 2>/dev/null || true; rm -rf "$WORK"; }
trap cleanup EXIT

# the map block exactly as production has it
awk '/map "\$http_authorization\$http_cookie" \$nabd_skip_cache/{p=1} p{print} p&&/^[[:space:]]*}/{exit}' "$ROOT/deploy/nginx/nginx.conf" > "$WORK/skip-map.conf"
grep -q 'default 1;' "$WORK/skip-map.conf" || { echo "FAIL: skip map not found in deploy/nginx/nginx.conf"; exit 1; }

python3 "$HERE/stub.py" 9871 & STUB=$!
docker run -d --name "$NAME" --network host \
  -v "$HERE/test.conf:/etc/nginx/nginx.conf:ro" \
  -v "$ROOT/deploy/nginx/snippets:/etc/nginx/snippets:ro" \
  -v "$WORK/skip-map.conf:/etc/nginx/test/skip-map.conf:ro" \
  nginx:1.27-alpine >/dev/null
for i in $(seq 1 50); do curl -fs -o /dev/null http://127.0.0.1:9872/api/v1/medicines/ping && break; sleep 0.2; done
docker exec "$NAME" nginx -t

B=http://127.0.0.1:9872/api/v1
fail=0
hits() { curl -fs http://127.0.0.1:9871/__hits | python3 -c "import json,sys; print(json.load(sys.stdin).get('$1',0))"; }

# 1. stampede: 1000 concurrent identical public requests
seq 1 1000 | xargs -P 200 -I{} curl -fs -o /dev/null "$B/medicines?q=stampede"
n=$(hits '/api/v1/medicines?q=stampede')
echo "public stampede: 1000 requests -> $n upstream hits"
[ "$n" -le 2 ] || { echo "FAIL: expected <= 2"; fail=1; }

# 2. credentials skip the cache both ways
curl -fs -o /dev/null "$B/medicines?q=shared"                       # anonymous copy is now cached
a=$(curl -fs -H 'Authorization: Bearer alice' "$B/medicines?q=shared")
c=$(curl -fs -H 'Cookie: sid=carol' "$B/medicines?q=shared")
echo "with credentials: $a $c"
[[ "$a" == *alice* && "$c" == *carol* ]] || { echo "FAIL: a credentialed request got a cached answer"; fail=1; }
curl -fs -H 'Authorization: Bearer bob' -o /dev/null "$B/medicines?q=bobfirst"
anon=$(curl -fs "$B/medicines?q=bobfirst")
[[ "$anon" != *bob* ]] || { echo "FAIL: a credentialed answer was stored and served to an anonymous caller"; fail=1; }

# 3. private answers are never stored
for i in 1 2 3; do curl -fs -o /dev/null "$B/me"; done
n=$(hits '/api/v1/me')
echo "private route: 3 requests -> $n upstream hits"
[ "$n" -eq 3 ] || { echo "FAIL: a private answer was cached"; fail=1; }

# 4. the full production config (every server block, the new locations) parses, with throwaway certs and hosts
mkdir -p "$WORK/le"
for d in $(grep -rhoE '/etc/letsencrypt/live/[^/]+' "$ROOT/deploy/nginx/conf.d" | sort -u | sed 's#.*/##'); do
  mkdir -p "$WORK/le/live/$d"
  openssl req -x509 -newkey rsa:2048 -nodes -subj "/CN=$d" -days 1 \
    -keyout "$WORK/le/live/$d/privkey.pem" -out "$WORK/le/live/$d/fullchain.pem" 2>/dev/null
  cp "$WORK/le/live/$d/fullchain.pem" "$WORK/le/live/$d/chain.pem"
done
hosts=""; for h in admin-web backend livekit nabdah-staging-backend patient-web mcp; do hosts="$hosts --add-host $h:127.0.0.1"; done
out=$(docker run --rm $hosts -v "$ROOT/deploy/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "$ROOT/deploy/nginx/conf.d:/etc/nginx/conf.d:ro" -v "$ROOT/deploy/nginx/snippets:/etc/nginx/snippets:ro" \
  -v "$WORK/le:/etc/letsencrypt:ro" nginx:1.27-alpine nginx -t 2>&1 || true)
# a runner without IPv6 fails the [::]:443 bind after the parse; the parse result is what this checks
echo "$out" | grep -q 'syntax is ok' && echo "production config: syntax is ok" || { echo "$out" | tail -5; echo "FAIL: production config"; fail=1; }

[ $fail -eq 0 ] && echo "PASS: nginx micro-cache" || exit 1
