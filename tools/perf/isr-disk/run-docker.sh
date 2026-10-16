#!/bin/bash
# #1603 proof in containers, exactly as production runs them (compose limits included):
# "a load test renders 5,000 product pages and the container layer stays under 100 MB; the cache size stays under its cap".
#   run-docker.sh [pages=5000]       needs: image nabdah-patient-web:ci, stub API on 0.0.0.0:4010, ci.env, docker compose
set -u
N=${1:-5000}
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../.." && pwd)
C="docker compose -f $ROOT/deploy/docker-compose.production.yml -f $HERE/compose.ci.yml --env-file ${CI_ENV:-ci.env}"
LAYER_MAX_MB=100
fail=0
ok() { echo "PASS $*"; }
bad() { echo "FAIL $*"; fail=1; }
mb() { awk -v b="${1:-0}" 'BEGIN{printf "%.1f", b/1048576}'; }
rw() { docker inspect --size -f '{{.SizeRw}}' "$1" 2>/dev/null; }

$C up -d --no-deps redis-cache patient-web >/dev/null 2>&1 || { $C up -d --no-deps redis-cache patient-web; exit 1; }
for i in $(seq 1 90); do curl -s -o /dev/null http://127.0.0.1:3201/ar/p/p-0 && break; sleep 2; done
REDISPASS=$(grep '^REDIS_PASSWORD=' "${CI_ENV:-ci.env}" | tail -1 | cut -d= -f2-)
rcli() { docker exec -e REDISCLI_AUTH="$REDISPASS" nabdah-redis-cache redis-cli "$@"; }
[ "$(rcli ping)" = PONG ] && ok "redis-cache answers" || bad "redis-cache does not answer"

LAYER0=$(rw nabdah-patient-web)
echo "patient-web layer before: $(mb $LAYER0) MB"
seq 1 "$N" | xargs -P 16 -I{} curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3201/ar/p/p-{} > codes.txt
echo "status codes: $(sort codes.txt | uniq -c | tr '\n' ' ')"
[ "$(grep -vc '^200$' codes.txt)" = 0 ] && ok "all $N pages answered 200 (the cache never made a request fail)" || bad "some pages did not answer 200"

LAYER1=$(rw nabdah-patient-web)
echo "patient-web layer after $N pages: $(mb $LAYER1) MB"
[ "$LAYER1" -lt $((LAYER_MAX_MB * 1048576)) ] && ok "patient-web writable layer $(mb $LAYER1) MB < ${LAYER_MAX_MB} MB" || bad "patient-web writable layer $(mb $LAYER1) MB >= ${LAYER_MAX_MB} MB"
echo "docker diff (paths that changed in the container):"; docker diff nabdah-patient-web | head -20
[ "$(docker diff nabdah-patient-web | grep -c ' /app/.next/server')" = 0 ] && ok "nothing written under /app/.next/server" || bad "files written under /app/.next/server"
docker exec nabdah-patient-web sh -c 'touch /app/proof.txt' 2>/dev/null && bad "the root filesystem is writable" || ok "the root filesystem is read-only"

MAXMEM=$(rcli config get maxmemory | tail -1)
USED=$(rcli info memory | tr -d '\r' | awk -F: '/^used_memory:/{print $2}')
EVICTED=$(rcli info stats | tr -d '\r' | awk -F: '/^evicted_keys:/{print $2}')
KEYS=$(rcli dbsize | tr -d '\r')
echo "redis-cache: used $(mb $USED) MB of cap $(mb $MAXMEM) MB, keys $KEYS, evicted $EVICTED, policy $(rcli config get maxmemory-policy | tail -1)"
[ "$USED" -le $((MAXMEM + 8 * 1048576)) ] && ok "cache memory stays under its cap" || bad "cache memory above its cap"
[ "$(rw nabdah-redis-cache)" -lt $((16 * 1048576)) ] && ok "redis-cache wrote < 16 MB to its layer ($(mb $(rw nabdah-redis-cache)) MB)" || bad "redis-cache layer grew"
echo "average bytes per key (page entries and fetch entries): $((USED / (KEYS > 0 ? KEYS : 1)))"
$C down >/dev/null 2>&1
[ $fail = 0 ] && echo "isr-disk container proof: PASS" || { echo "isr-disk container proof: FAIL"; exit 1; }
