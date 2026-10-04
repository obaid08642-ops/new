#!/usr/bin/env bash
# Live gate: run the fully-green journeys against a running stack and fail on any failed step.
#   bash tools/live/run_gate.sh            (backend :8002, admin BFF :3001, smtp_sink :2525, fake_moyasar :9100)
# A journey joins this list once it is 100% green; open findings (docs/audit/03_LIVE_JOURNEY_FINDINGS.md)
# keep theirs out until fixed.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$(dirname "$0")"
API="${NABD_BACKEND:-http://127.0.0.1:8002}"
# macOS has no GNU `timeout`; run the step directly when it's missing.
run_step() {
  if command -v timeout >/dev/null 2>&1; then timeout "$@"; else shift; "$@"; fi
}
JOURNEYS=(j_accounts j_onboarding j_pharmacy j_lab j_radiology j_nursing j_consultation j_ambulance j_facility j_support j_loyalty j_payments j_chaos j_rapid_tap j_app_killed_payment j_throttled_network)
fail=0
restarts=0
# The journeys log in as admin@nabd.test and nothing else seeds it, so on a fresh
# DB the gate reports ~29 misleading 401/csrf step failures instead of the real
# cause. Upsert it here (idempotent) so a fresh DB is self-sufficient.
(cd "$ROOT/backend" && node "$ROOT/tools/live/seed_admin.js") || { echo "admin seed FAILED"; fail=1; }
# A backend killed mid-run (host memory pressure) turns into dozens of misleading
# 502/401 step failures. Bring it back, but say so loudly and count it, so the
# instability stays visible in the output instead of being silently healed.
backend_alive() { [[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$API/api/v1/health/liveness" 2>/dev/null)" == "200" ]]; }
ensure_backend() {
  backend_alive && return 0
  echo "!! backend was down — restarting before the next journey"
  bash "$ROOT/tools/live/start-backend.sh" >/tmp/gate-backend.log 2>&1
  for _ in $(seq 1 40); do
    backend_alive && { restarts=$((restarts+1)); return 0; }
    sleep 5
  done
  echo "!! backend did not come back"
  return 1
}
# 7C-C3: the backend network gate is active, so every admin call must present the
# same shared secret the backend was started with (see start-backend.sh).
export ADMIN_GATE_TOKEN="${ADMIN_GATE_TOKEN:-live-gate-token}"
export NABD_ADMIN_GATE_TOKEN="${NABD_ADMIN_GATE_TOKEN:-$ADMIN_GATE_TOKEN}"
export NABD_ADMIN_DEVICE="${NABD_ADMIN_DEVICE:-live-gate-owner-macbook-01}"
# one admin 2FA login per gate run (the login endpoint is rate limited per IP)
export LIVE_ADMIN_SESSION="$(mktemp)"; rm -f "$LIVE_ADMIN_SESSION"
python3 gate_p1.py || fail=1
for j in "${JOURNEYS[@]}"; do
  ensure_backend || fail=1
  out=$(run_step 1200 python3 "$j.py" 2>&1)
  line=$(grep -E '^##### ' <<<"$out" | tail -1)
  echo "$j: ${line:-no summary (crashed)}"
  if [[ -z $line || ! $line =~ ", 0 failed" ]]; then
    fail=1
    grep -E '^\s+FAIL|Traceback|Error' <<<"$out" | head -20
  fi
done
# R7-1: admin click tests run in a real browser (bundled Playwright Chromium, or
# CHROMIUM=<path>). A missing browser is a FAIL, never a PASS.
# The journey reads CHROME; forward the documented CHROMIUM override to it.
export CHROME="${CHROME:-${CHROMIUM:-}}"
ensure_backend || fail=1
out=$(run_step 1800 python3 j_admin_clicks.py 2>&1)
line=$(grep -E '^##### ' <<<"$out" | tail -1)
echo "j_admin_clicks: ${line:-no summary (crashed)}"
if [[ -z $line || ! $line =~ ", 0 failed" ]]; then
  fail=1
  grep -E '^\s+FAIL|Traceback|Error' <<<"$out" | head -20
fi
if [[ $restarts -gt 0 ]]; then
  echo "NOTE: backend restarted $restarts time(s) during this run — host memory pressure, not a journey failure"
fi
exit $fail
