#!/usr/bin/env bash
# P14.11 check: the API micro-cache (real snippet + real skip map) in the production nginx image in front of a counting stub.
#  1. 1000 concurrent identical public requests reach the backend at most twice.
#  2. Requests with Authorization or a cookie are never stored nor served from the cache, so no one gets another's answer.
#  3. Private answers (Cache-Control: private, no-store) are never stored, even without credentials.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
HERE="$ROOT/tools/perf/nginx-microcache"
WORK=$(mktemp -d); chmod 755 "$WORK"
NAME=nabd-ngx-microcache
# the image production runs (deploy/docker-compose.production.yml), so a config the image cannot load fails here
NGINX_IMAGE=$(awk '/^  nginx:/{f=1} f&&/image:/{print $2; exit}' "$ROOT/deploy/docker-compose.production.yml")
echo "nginx image: $NGINX_IMAGE"
cleanup() { docker rm -f "$NAME" nabd-ngx-resolve nabd-ngx-up-a nabd-ngx-up-b nabd-ngx-filler >/dev/null 2>&1 || true; docker network rm nabd-ngx-net >/dev/null 2>&1 || true; kill "${STUB:-0}" 2>/dev/null || true; rm -rf "$WORK"; }
trap cleanup EXIT

# the map block exactly as production has it
awk '/map "\$http_authorization\$http_cookie" \$nabd_skip_cache/{p=1} p{print} p&&/^[[:space:]]*}/{exit}' "$ROOT/deploy/nginx/nginx.conf" > "$WORK/skip-map.conf"
grep -q 'default 1;' "$WORK/skip-map.conf" || { echo "FAIL: skip map not found in deploy/nginx/nginx.conf"; exit 1; }

python3 "$HERE/stub.py" 9871 & STUB=$!
docker run -d --name "$NAME" --network host \
  -v "$HERE/test.conf:/etc/nginx/nginx.conf:ro" \
  -v "$ROOT/deploy/nginx/snippets:/etc/nginx/snippets:ro" \
  -v "$WORK/skip-map.conf:/etc/nginx/test/skip-map.conf:ro" \
  $NGINX_IMAGE >/dev/null
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
  -v "$WORK/le:/etc/letsencrypt:ro" $NGINX_IMAGE nginx -t 2>&1 || true)
# a runner without IPv6 fails the [::]:443 bind after the parse; the parse result is what this checks
echo "$out" | grep -q 'syntax is ok' && echo "production config: syntax is ok" || { echo "$out" | tail -5; echo "FAIL: production config"; fail=1; }

# 5. a recreated container on a new address is followed without a reload (production's upstream block, real resolver):
#    the 2026-10-15 rehearsal sent nabd.plus to admin-web after patient-web came back on another address.
awk '/^  resolver /{print} /^  upstream patient_web_pool \{/{p=1} p{print} p&&/^  \}/{exit}' "$ROOT/deploy/nginx/nginx.conf" > "$WORK/pool.conf"
grep -q 'resolve;' "$WORK/pool.conf" && grep -q '^  resolver 127.0.0.11' "$WORK/pool.conf" || { echo "FAIL: patient_web_pool with resolve and the Docker resolver not found in deploy/nginx/nginx.conf"; fail=1; }
cat > "$WORK/resolve.conf" <<CONF
events {}
http {
$(cat "$WORK/pool.conf")
  server { listen 8080; location / { proxy_pass http://patient_web_pool; } }
}
CONF
stub() { docker run -d --name "$1" --network nabd-ngx-net ${2:+--network-alias "$2"} "$NGINX_IMAGE" sh -c "printf 'events{} http{server{listen 3000; location / {return 200 $1;}}}' > /tmp/s.conf && exec nginx -c /tmp/s.conf -g 'daemon off;'" >/dev/null; }
docker network create nabd-ngx-net >/dev/null
stub nabd-ngx-up-a patient-web
docker run -d --name nabd-ngx-resolve --network nabd-ngx-net -p 127.0.0.1:9873:8080 -v "$WORK/resolve.conf:/etc/nginx/nginx.conf:ro" "$NGINX_IMAGE" >/dev/null
first=""; for i in $(seq 1 50); do first=$(curl -fs http://127.0.0.1:9873/ar || true); [ -n "$first" ] && break; sleep 0.2; done
ip_a=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' nabd-ngx-up-a)
# replace the upstream; a filler takes the old address first, so the new one comes back elsewhere (what a deploy did)
docker rm -f nabd-ngx-up-a >/dev/null
stub nabd-ngx-filler
stub nabd-ngx-up-b patient-web
ip_b=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' nabd-ngx-up-b)
after=""; for i in $(seq 1 30); do after=$(curl -fs http://127.0.0.1:9873/ar || true); [ "$after" = nabd-ngx-up-b ] && break; sleep 1; done
echo "re-resolution: before=$first ($ip_a) after=$after ($ip_b), no reload"
[ "$first" = nabd-ngx-up-a ] && [ "$ip_a" != "$ip_b" ] && [ "$after" = nabd-ngx-up-b ] || { echo "FAIL: nginx did not follow the recreated upstream"; fail=1; }

[ $fail -eq 0 ] && echo "PASS: nginx micro-cache" || exit 1
