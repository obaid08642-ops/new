#!/usr/bin/env bash
# P14.28: rehearsal of scale step 3 (deploy/SCALING.md): two API nodes (PROCESS_ROLE=api) and one worker
# (PROCESS_ROLE=worker) behind an nginx load balancer, on a 3-node MongoDB replica set, with test data only.
#   bash tools/perf/scale-rehearsal/run.sh                 (needs: a built backend, Redis on 6379, nginx, k6, python3,
#                                                           the test doubles of tools/live: S3 :9000, SMTP :2525, Moyasar :9100)
#   MONGO_MODE=docker (CI: mongo:7 containers on the host network) | binary (MONGOD=<path to a mongod binary>)
# Proves, each with a measured line in $OUT/report.md:
#   1. the replica set has 3 members and the app writes with majority acknowledgement through it
#   2. the readiness of the fleet: the worker's heartbeat is seen through the load balancer
#   3. the load balancer spreads requests over both API nodes
#   4. throughput: one node direct vs two nodes behind the load balancer (the same k6 mix, capacity.js)
#   5. an API node dies under load and comes back: errors during the outage, recovery
#   6. the Mongo primary steps down under load: errors during the election, recovery
# Exit 1 when a check fails (not when a number is merely slow: the numbers are the report).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
HERE="$ROOT/tools/perf/scale-rehearsal"
OUT="${OUT:-/tmp/scale-rehearsal}"
K6="${K6:-k6}"
MONGO_MODE="${MONGO_MODE:-docker}"
DURATION="${DURATION:-60s}"
VUS="${VUS:-30}"
export DB_NAME=nabd_scale_test
export MONGO_URL="mongodb://127.0.0.1:27021,127.0.0.1:27022,127.0.0.1:27023/?replicaSet=rs-scale"
export MOYASAR_WEBHOOK_SECRET=perf-webhook-secret-test-only WEBHOOK_SECRET=perf-webhook-secret-test-only ALLOW_WRITES=1
rm -rf "$OUT"; mkdir -p "$OUT"
# everything this run starts is stopped on exit (the shared Redis and the test doubles are left running)
cleanup() {
  nginx -p "$OUT" -c "$OUT/nginx.conf" -s stop 2>/dev/null
  for f in "$OUT"/node-*.log.pid "$OUT"/mongod-*.pid; do [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null; done
  [ "$MONGO_MODE" = docker ] && docker rm -f mongo-27021 mongo-27022 mongo-27023 >/dev/null 2>&1
  return 0
}
trap cleanup EXIT
REPORT="$OUT/report.md"
fail=0
say() { echo "$*" | tee -a "$REPORT"; }
check() { if [ "$2" = 0 ]; then say "- PASS $1"; else say "- FAIL $1"; fail=1; fi; }
node_js() { (cd "$ROOT/backend" && node -e "$1" "${@:2}"); }

# ------------------------------------------------------------------ the replica set
for p in 27021 27022 27023; do
  if [ "$MONGO_MODE" = docker ]; then
    docker run -d --name "mongo-$p" --network host mongo:7 --replSet rs-scale --port "$p" --bind_ip 127.0.0.1 >/dev/null
  else
    mkdir -p "$OUT/db-$p"
    nohup "$MONGOD" --replSet rs-scale --port "$p" --bind_ip 127.0.0.1 --dbpath "$OUT/db-$p" > "$OUT/mongod-$p.log" 2>&1 &
    echo $! > "$OUT/mongod-$p.pid"
  fi
done
sleep 5
node_js '
const m = require("mongoose");
(async () => {
  await m.connect("mongodb://127.0.0.1:27021/?directConnection=true");
  const a = m.connection.db.admin();
  await a.command({ replSetInitiate: { _id: "rs-scale", members: [27021, 27022, 27023].map((p, i) => ({ _id: i, host: "127.0.0.1:" + p })) } });
  for (let i = 0; i < 60; i++) {
    const s = await a.command({ replSetGetStatus: 1 }).catch(() => null);
    if (s && s.members.filter((x) => x.stateStr === "PRIMARY").length === 1 && s.members.filter((x) => x.stateStr === "SECONDARY").length === 2) { console.log("replica set ready"); process.exit(0); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log("replica set not ready"); process.exit(1);
})().catch((e) => { console.error(e.message); process.exit(1); });' || { echo "replica set did not start"; exit 1; }

say "# Scale step 3 rehearsal ($(date -u +%FT%TZ), test data, $(nproc) vCPU, one machine)"
say ""
# ------------------------------------------------------------------ 1. majority writes through the set
(cd "$ROOT/backend" && node ../tools/live/seed_admin.js >/dev/null && node ../tools/perf/k6/seed-perf-data.js 21000 2000 > "$OUT/seed.log") \
  || { echo "seed failed"; exit 1; }
node_js '
const m = require("mongoose");
(async () => {
  await m.connect(process.env.MONGO_URL, { dbName: process.env.DB_NAME });
  const s = await m.connection.db.admin().command({ replSetGetStatus: 1 });
  await m.connection.db.collection("scale_rehearsal").insertOne({ at: new Date() }, { writeConcern: { w: "majority", wtimeout: 5000 } });
  console.log(s.members.map((x) => x.name + "=" + x.stateStr).join(" "));
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });' > "$OUT/rs.txt"
check "replica set: $(cat "$OUT/rs.txt"); a write with w:majority is acknowledged" $?

# ------------------------------------------------------------------ the fleet
start() { KEEP_OTHER_BACKENDS=1 PORT="$1" PROCESS_ROLE="$2" BACKEND_LOG="$OUT/node-$1.log" bash "$ROOT/tools/live/start-backend.sh" > /dev/null; }
start 8103 worker || { tail -30 "$OUT/node-8103.log"; exit 1; }
start 8101 api || { tail -30 "$OUT/node-8101.log"; exit 1; }
start 8102 api || { tail -30 "$OUT/node-8102.log"; exit 1; }
mkdir -p "$OUT/tmp-body" "$OUT/tmp-proxy"
sed "s#__OUT__#$OUT#g" "$HERE/nginx.conf" > "$OUT/nginx.conf"
nginx -p "$OUT" -c "$OUT/nginx.conf" || { cat "$OUT/nginx-error.log"; exit 1; }
LB=http://127.0.0.1:8100/api/v1

# ------------------------------------------------------------------ 2. readiness through the load balancer
R=$(curl -s --max-time 10 "$LB/health/readiness")
W=$(printf '%s' "$R" | python3 -c 'import json,sys; d=json.load(sys.stdin); print((d.get("details") or {}).get("background_worker","?"))' 2>/dev/null)
[ "$W" = up ]; check "readiness through the load balancer: background_worker=$W (one worker for the fleet)" $?

# ------------------------------------------------------------------ 3. spread over both nodes
: > "$OUT/lb-access.log"; nginx -p "$OUT" -c "$OUT/nginx.conf" -s reopen; sleep 1
# 20 at a time (xargs: `wait` would also wait for the mongod processes this script started)
seq 1 200 | xargs -P 20 -I{} curl -s -o /dev/null "$LB/public/products/search?locale=ar&limit=5&page={}"
a=$(grep -c ' 127.0.0.1:8101 ' "$OUT/lb-access.log"); b=$(grep -c ' 127.0.0.1:8102 ' "$OUT/lb-access.log")
[ "$a" -ge 40 ] && [ "$b" -ge 40 ]; check "the load balancer spreads 200 requests over both API nodes: 8101=$a, 8102=$b" $?

# ------------------------------------------------------------------ fixtures through the load balancer
NABD_API="http://127.0.0.1:8100/api/v1" python3 "$ROOT/tools/perf/k6/fixtures.py" > "$OUT/fixtures.json" 2> "$OUT/fixtures.err"
check "fixtures (doctor, patients, paid booking, chat thread, call session) made through the load balancer" $?
[ -s "$OUT/fixtures.json" ] || { echo "--- fixtures.err (last 40 lines)"; tail -40 "$OUT/fixtures.err"; }

run_k6() { # $1 name, $2 base url
  "$K6" run -q -e BASE="$2" -e SCENARIO=constant -e VUS="$VUS" -e DURATION="$DURATION" -e FIXTURES="$OUT/fixtures.json" \
    --summary-export "$OUT/k6-$1.json" "$ROOT/tools/perf/k6/capacity.js" > "$OUT/k6-$1.log" 2>&1
}
k6_line() { python3 - "$OUT/k6-$1.json" <<'PY'
import json, sys
m = json.load(open(sys.argv[1]))['metrics']
p = lambda k: round(m.get(k, {}).get('p(95)', 0))
e = m.get('scenario_errors', {})
print(f"{m['http_reqs']['rate']:.0f} req/s, public p95 {p('public_api')} ms, logged-in p95 {p('logged_in_api')} ms, "
      f"booking p95 {p('booking')} ms, cart p95 {p('checkout')} ms, errors {e.get('passes', 0)}/{e.get('passes', 0) + e.get('fails', 0)}")
PY
}
errors_of() { python3 -c 'import json,sys; e=json.load(open(sys.argv[1]))["metrics"].get("scenario_errors",{}); print(e.get("passes",0))' "$OUT/k6-$1.json"; }

# ------------------------------------------------------------------ 4. one node vs two
say ""
say "Throughput, $VUS VUs for $DURATION, the capacity.js mix:"
run_k6 one-node http://127.0.0.1:8101; say "- one API node direct: $(k6_line one-node)"
sleep 10
run_k6 two-nodes http://127.0.0.1:8100; say "- two API nodes behind the load balancer: $(k6_line two-nodes)"
say ""

# ------------------------------------------------------------------ 5. an API node dies under load
( sleep 20; kill -9 "$(cat "$OUT/node-8102.log.pid")"; echo "killed $(date +%s)" > "$OUT/kill.txt"
  sleep 20; start 8102 api; echo "back $(date +%s)" >> "$OUT/kill.txt" ) &
killer=$!
run_k6 node-down http://127.0.0.1:8100
wait $killer
ERR=$(errors_of node-down)
say "API node 8102 killed (kill -9) 20 s into the run, restarted 20 s later: $(k6_line node-down)"
up=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8102/api/v1/health/liveness)
[ "$up" = 200 ]; check "the killed node is back and healthy ($up)" $?
# only in-flight writes on the dying node may fail (nginx retries reads once on the other node, never writes)
[ "$ERR" -le "${MAX_NODE_DOWN_ERRORS:-20}" ]; check "errors while a node was down: $ERR (allowed: in-flight writes on that node, at most ${MAX_NODE_DOWN_ERRORS:-20})" $?
say ""

# ------------------------------------------------------------------ 6. the Mongo primary steps down under load
( sleep 20; node_js '
const m = require("mongoose");
(async () => {
  await m.connect(process.env.MONGO_URL, { dbName: process.env.DB_NAME });
  const a = m.connection.db.admin();
  const before = (await a.command({ replSetGetStatus: 1 })).members.find((x) => x.stateStr === "PRIMARY").name;
  const t0 = Date.now();
  await a.command({ replSetStepDown: 30, secondaryCatchUpPeriodSecs: 10 }).catch(() => null);
  for (;;) {
    const s = await a.command({ replSetGetStatus: 1 }).catch(() => null);
    const p = s && s.members.find((x) => x.stateStr === "PRIMARY");
    if (p && p.name !== before) { console.log(before + " stepped down, " + p.name + " elected in " + (Date.now() - t0) + " ms"); break; }
    await new Promise((r) => setTimeout(r, 200));
  }
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });' > "$OUT/stepdown.txt" 2>&1 ) &
stepper=$!
run_k6 stepdown http://127.0.0.1:8100
wait $stepper
ERR=$(errors_of stepdown)
say "Mongo primary stepped down 20 s into the run ($(cat "$OUT/stepdown.txt")): $(k6_line stepdown)"
grep -q "elected in" "$OUT/stepdown.txt"; check "a new primary was elected" $?
[ "$ERR" -le "${MAX_STEPDOWN_ERRORS:-20}" ]; check "errors during the election: $ERR (allowed: requests in flight during the election, at most ${MAX_STEPDOWN_ERRORS:-20})" $?
after=$(curl -s -o /dev/null -w '%{http_code}' "$LB/public/products/search?locale=en&limit=5")
[ "$after" = 200 ]; check "the API answers after the election ($after)" $?

say ""
say "Result: $([ $fail = 0 ] && echo PASS || echo FAIL)"
exit $fail
