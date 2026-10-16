#!/bin/bash
# P14.10 Verify: two web instances behind nginx serve the same revalidated content with the same Cache-Control.
# Needs: a build made with NEXT_CACHE_HANDLER=redis (patient-web/.next/standalone), Redis on 127.0.0.1:6379, docker.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
WEB=$(cd "$HERE/../../../patient-web" && pwd)
PAGE=/ar/p/rehearsal-product
SECRET=rehearsal-revalidate-secret
fail() { echo "FAIL: $*"; exit 1; }
name() { curl -s "$1$PAGE" | grep -o 'Rehearsal product v[0-9]' | head -1; }
cc() { curl -s -o /dev/null -D - "$1$PAGE" | tr -d '\r' | awk -F': ' 'tolower($1)=="cache-control"{print $2}'; }

for p in 3101 3102; do
  (cd "$WEB/.next/standalone" && PORT=$p HOSTNAME=127.0.0.1 NEXT_CACHE_REDIS_URL=redis://127.0.0.1:6379 NEXT_REVALIDATE_SECRET=$SECRET \
    NABD_API_BASE_URL=http://127.0.0.1:4010/api/v1 node server.js > /tmp/web-$p.log 2>&1 &)
done
docker run -d --rm --name multi-nginx --network host -v "$HERE/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:1.28.0-alpine >/dev/null
for p in 3101 3102 8088; do for i in $(seq 1 60); do curl -s -o /dev/null "http://127.0.0.1:$p/ar" && break; sleep 1; done; done

A=http://127.0.0.1:3101; B=http://127.0.0.1:3102; N=http://127.0.0.1:8088
curl -s -X POST localhost:4010/__version -d '{"v":"1"}' >/dev/null
[ "$(name $A)" = "Rehearsal product v1" ] || fail "A does not render v1"
[ "$(name $B)" = "Rehearsal product v1" ] || fail "B does not render v1"
echo "both instances render v1 (cached)"
redis-cli --scan --pattern 'nabd:next:*' | head -3 | sed 's/^/redis key: /'
[ "$(redis-cli --scan --pattern 'nabd:next:*:e:*' | wc -l)" -gt 0 ] || fail "nothing in Redis"

curl -s -X POST localhost:4010/__version -d '{"v":"2"}' >/dev/null
[ "$(name $B)" = "Rehearsal product v1" ] || fail "B changed before any revalidation (cache not used)"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$A/api/revalidate" -H "authorization: Bearer $SECRET" -H 'content-type: application/json' -d '{"tags":["medicines"]}')
[ "$code" = 200 ] || fail "revalidate on A answered $code"
echo "revalidated tag medicines on instance A only"
sleep 1
for i in 1 2 3; do curl -s -o /dev/null "$B$PAGE"; done
[ "$(name $B)" = "Rehearsal product v2" ] || fail "B still serves the old content after A revalidated (not shared)"
[ "$(name $A)" = "Rehearsal product v2" ] || fail "A does not serve v2"
for i in 1 2 3 4 5 6; do [ "$(name $N)" = "Rehearsal product v2" ] || fail "nginx round robin served old content"; done
echo "after a revalidation on A: B, A and nginx (round robin, 6 requests) all serve v2"

CA=$(cc $A); CB=$(cc $B)
echo "Cache-Control A: $CA"; echo "Cache-Control B: $CB"
[ -n "$CA" ] && [ "$CA" = "$CB" ] || fail "Cache-Control differs between instances"
echo "$CA" | grep -q 's-maxage' || fail "no s-maxage on the ISR page"
echo "PASS: two instances, one Redis cache: same revalidated content, same Cache-Control"
docker rm -f multi-nginx >/dev/null 2>&1
exit 0
