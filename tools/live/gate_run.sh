#!/usr/bin/env bash
# Start the whole live stack and run the gate in ONE process tree.
#
# Why this exists: the backend / admin BFF / patient-web are long-lived
# background processes. When they are started from one shell invocation and the
# gate runs from another, the harness processes can be reaped between
# invocations — the run then dies mid-journey with "Connection refused" and
# every later journey reports "crashed", which is an infrastructure artifact and
# not a product failure. Starting the stack and running the gate in the same
# command keeps one parent alive for the whole run.
#
#   bash tools/live/gate_run.sh            # start missing services, run the gate
#   FRESH=1 bash tools/live/gate_run.sh    # wipe the live DB first (fresh seeds)
set -uo pipefail
export DEVELOPER_DIR=/Library/Developer/CommandLineTools
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

API=http://127.0.0.1:8002
ADMIN_WEB=http://127.0.0.1:3001
PATIENT_WEB=http://127.0.0.1:3000
export ADMIN_GATE_TOKEN="${ADMIN_GATE_TOKEN:-live-gate-token}"
export NABD_ADMIN_GATE_TOKEN="${NABD_ADMIN_GATE_TOKEN:-$ADMIN_GATE_TOKEN}"
export NABD_ADMIN_DEVICE="${NABD_ADMIN_DEVICE:-live-gate-owner-macbook-01}"

alive() { curl -s -o /dev/null -m 3 "$1"; }
wait_up() { for _ in $(seq 1 "${3:-60}"); do alive "$1" && return 0; sleep 1; done; return 1; }

if [[ "${FRESH:-0}" == "1" ]]; then
  echo "== fresh live DB =="
  bash /var/folders/f1/j1zvgjbj0m16m2rwky7f5zqr0000gn/T/fresh.sh || exit 1
fi

echo "== stack =="
# Always restart the backend rather than trusting a listener: this workspace is
# shared, and a backend left behind by another process (or started from the repo
# root instead of backend/, which fails with MODULE_NOT_FOUND) looks healthy on
# a health probe but dies mid-gate.
start_backend() { bash "$ROOT/tools/live/start-backend.sh" > /tmp/start-backend.out 2>&1; }
start_backend
if ! wait_up "$API/api/v1/health/liveness" 90; then
  echo "backend did not come up; retrying once"
  start_backend
  wait_up "$API/api/v1/health/liveness" 90 || { echo "backend still down"; tail -20 /tmp/nabd-backend.log; exit 1; }
fi
echo "backend: $(pgrep -f 'dist/main.js' | wc -l | tr -d ' ') process(es)"

# The admin BFF is `next start` on :3001. start-web.sh stops the old listener
# first (it no-ops on macOS without the lsof port match, so check afterwards).
if ! alive "$ADMIN_WEB/"; then
  (cd "$ROOT/admin" && ADMIN_BACKEND_URL="$API" ADMIN_GATE_TOKEN="$ADMIN_GATE_TOKEN" NODE_ENV=production \
    nohup npx next start -p 3001 -H 127.0.0.1 > /tmp/admin-server.log 2>&1 &)
  wait_up "$ADMIN_WEB/" 60 || { echo "admin web did not come up"; tail -5 /tmp/admin-server.log; exit 1; }
fi

if ! alive "$PATIENT_WEB/"; then
  if [[ -f "$ROOT/patient-web/.next/standalone/server.js" ]]; then
    (cd "$ROOT/patient-web" && rm -rf .next/standalone/public .next/standalone/.next/static \
      && cp -r public .next/standalone/ && mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/)
    (cd "$ROOT/patient-web/.next/standalone" && PORT=3000 HOSTNAME=127.0.0.1 NABD_API_BASE_URL="$API/api/v1" \
      NEXT_PUBLIC_SITE_ORIGIN=http://localhost:3000 NODE_ENV=production nohup node server.js > /tmp/pw-server.log 2>&1 &)
  fi
  wait_up "$PATIENT_WEB/" 60 || echo "WARNING: patient-web not up (only j_accounts needs it)"
fi

for s in "$API/api/v1/health/liveness" "$ADMIN_WEB/" "$PATIENT_WEB/"; do
  printf '%s -> %s\n' "$s" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 "$s")"
done

# Re-check the stack before every journey. This workspace is shared: another
# process (or a stray start-web.sh) can kill the web servers mid-run, and a dead
# admin BFF makes every later journey "crash" on ConnectionRefused, which reads
# like a product failure but is an infrastructure artifact. Restart what is down
# instead of reporting phantom failures.
cd "$ROOT/tools/live"
# The admin session cache must NOT exist yet: j_admin._reuse() json.load()s it
# and an empty file is a JSONDecodeError that crashes every journey.
if [[ -z "${LIVE_ADMIN_SESSION:-}" ]]; then
  LIVE_ADMIN_SESSION="$(mktemp)"; rm -f "$LIVE_ADMIN_SESSION"
fi
export LIVE_ADMIN_SESSION
ensure_stack() {
  if ! alive "$API/api/v1/health/liveness"; then
    echo "-- backend down, restarting"
    bash "$ROOT/tools/live/start-backend.sh" > /tmp/start-backend.out 2>&1
    wait_up "$API/api/v1/health/liveness" 90
  fi
  if ! alive "$ADMIN_WEB/"; then
    echo "-- admin web down, restarting"
    (cd "$ROOT/admin" && ADMIN_BACKEND_URL="$API" ADMIN_GATE_TOKEN="$ADMIN_GATE_TOKEN" NODE_ENV=production \
      nohup npx next start -p 3001 -H 127.0.0.1 > /tmp/admin-server.log 2>&1 &)
    wait_up "$ADMIN_WEB/" 60
  fi
}

echo "== gate =="
gate=0
run_one() {
  local j="$1" limit="$2" out line
  out=$(python3 "$j.py" 2>&1); local rc=$?
  line=$(grep -E '^##### ' <<<"$out" | tail -1)
  echo "$j: ${line:-no summary (rc=$rc)}"
  if [[ -z $line || ! $line =~ ", 0 failed" ]]; then
    gate=1
    grep -E '^\s+FAIL|Traceback|Error' <<<"$out" | head -20
  fi
}
JOURNEYS=(j_accounts j_onboarding j_pharmacy j_lab j_radiology j_nursing j_consultation j_ambulance j_facility j_support j_loyalty j_chaos j_rapid_tap j_app_killed_payment j_throttled_network j_killswitches)
python3 gate_p1.py || gate=1
for j in "${JOURNEYS[@]}"; do
  ensure_stack
  run_one "$j" 1200
done
ensure_stack
out=$(python3 j_admin_clicks.py 2>&1); rc=$?
line=$(grep -E '^##### ' <<<"$out" | tail -1)
echo "j_admin_clicks: ${line:-no summary (rc=$rc)}"
if [[ -z $line || ! $line =~ ", 0 failed" ]]; then
  gate=1
  grep -E '^\s+FAIL|Traceback|Error' <<<"$out" | head -20
fi

echo "== gate exit: $gate =="
exit $gate
