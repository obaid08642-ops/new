#!/bin/bash
# 20.9 proof: a rolling deploy during a k6 run shows 0 failed requests (CI: .github/workflows/zero-downtime.yml).
# Real nginx (1.28, upstream `resolve`), real docker compose, the real deploy/scripts/rolling-deploy.sh; the API is the stand-in in stub/.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../.." && pwd)
export COMPOSE_FILES="$HERE/docker-compose.yml" DEPLOY_DIR="$HERE" ENV_FILE=/nonexistent
BASE=http://127.0.0.1:8080
n=0; bad=0
check() { n=$((n+1)); if [ "$2" = 0 ]; then echo "ok $n - $1"; else echo "NOT OK $n - $1"; bad=$((bad+1)); fi; }
ver() { curl -s "$BASE/api/v1/ping" | sed -n 's/.*"v":"\([^"]*\)".*/\1/p'; }
k6run() { # name duration -> runs k6 in the background, summary in $HERE/out-<name>.json
  docker run --rm --network host -v "$HERE:/w" -e BASE=$BASE -e DURATION=$2 grafana/k6:0.54.0 run --quiet --summary-export=/w/out-$1.json /w/load.js >"$HERE/k6-$1.log" 2>&1 &
  K6PID=$!
}
metric() { python3 -c "import json,sys;d=json.load(open('$HERE/out-$1.json'))['metrics'];print(d['$2']['$3'])"; }

for v in v1 v2; do docker build -q -t zd-stub:$v --build-arg VERSION=$v "$HERE/stub" >/dev/null; done
docker build -q -t zd-stub:v3 --build-arg VERSION=v3 --build-arg FAIL_HEALTH=1 "$HERE/stub" >/dev/null
VERSION=v1 docker compose -f "$HERE/docker-compose.yml" up -d >/dev/null
for i in $(seq 1 30); do [ "$(ver)" = v1 ] && break; sleep 1; done
check "stack serves v1 through nginx" $([ "$(ver)" = v1 ]; echo $?)

# ── 1. rolling deploy v1 -> v2 under load ───────────────────────────────────
k6run roll 100 100
sleep 20
VERSION=v2 bash "$ROOT/deploy/scripts/rolling-deploy.sh" backend 2>&1 | tee "$HERE/roll.log"; rc=${PIPESTATUS[0]}
check "rolling deploy v1 -> v2 exits 0" $rc
wait $K6PID; echo "k6 exit $?"; tail -25 "$HERE/k6-roll.log"
check "k6: 0 failed requests during the deploy" $([ "$(metric roll http_req_failed value)" = 0 ] && [ "$(metric roll http_reqs count)" -gt 4000 ]; echo $?)
check "k6: every check passed" $([ "$(metric roll checks fails)" = 0 ]; echo $?)
check "k6: both versions served traffic (v1 before, v2 after)" $([ "$(metric roll served_v1 count)" -gt 0 ] && [ "$(metric roll served_v2 count)" -gt 0 ]; echo $?)
check "after the deploy only v2 answers" $([ "$(ver)" = v2 ]; echo $?)
check "no leftover roll container" $(docker ps -a --format '{{.Names}}' | grep -q 'nabdah-backend-roll'; [ $? -ne 0 ]; echo $?)

# ── 2. a broken release under load: automatic rollback, still 0 failures ────
k6run broken 50 
sleep 8
VERSION=v3 HEALTH_TIMEOUT=25 bash "$ROOT/deploy/scripts/rolling-deploy.sh" backend 2>&1 | tee "$HERE/broken.log"; rc=${PIPESTATUS[0]}
check "broken release (v3 unhealthy) makes the deploy exit non-zero" $([ "$rc" -ne 0 ]; echo $?)
grep -q "ROLLED BACK" "$HERE/broken.log"; check "the log says ROLLED BACK" $?
wait $K6PID; tail -8 "$HERE/k6-broken.log"
check "k6: 0 failed requests while the broken release was tried" $([ "$(metric broken http_req_failed value)" = 0 ]; echo $?)
check "the old version (v2) still serves" $([ "$(ver)" = v2 ]; echo $?)
check "no v3 request was ever served" $([ "$(metric broken served_v3 count 2>/dev/null || echo 0)" = 0 ]; echo $?)

VERSION=v2 docker compose -f "$HERE/docker-compose.yml" down -v >/dev/null 2>&1
echo "$((n-bad))/$n checks passed"
[ "$bad" = 0 ]
