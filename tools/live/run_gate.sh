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
JOURNEYS=(j_accounts j_otp_abuse j_social_login j_onboarding j_pharmacy j_lab j_radiology j_nursing j_consultation j_facility j_support j_loyalty j_chaos j_rapid_tap j_app_killed_payment j_throttled_network j_killswitches j_web_pharmacy j_web_care j_rx_substitute j_web_dashboard j_admin_problems j_web_signup j_web_payment_result j_web_public_feed j_provider_review j_no_ambulance j_web_health_logging j_payouts j_b8_texts j_rx_flags j_web_one_cancel j_lab_result_push j_sfda_price_review j_password_reset_link j_provider_proposals j_pharmacy_catalogue_lines j_web_compare_catalogue j_doctor_photos j_web_home_nursing j_web_assistant j_web_offline j_web_offers_waiting j_web_b0_public j_provider_side_b j_admin_catalogue_fields j_web_cancel_home j_manual_request j_pregnancy_weeks j_patient_flows_c j_web_family_scan j_family_book_for_member j_family_meds j_app_populated_lists j_rx_rules_fields j_consult_filters_b j_admin_urgent_alerts j_doctor_home_position j_pharmacy_insurance_inline j_admin_kill_switches j_web_call j_pharmacy_owner_decisions j_lab_preparation_langs j_catalogue_variants)
# j_killswitches (15.12) joins once Phase 14.4 is ported: it needs the kill-switch helper,
# the six seeded flag rows and their consumers (14.4/14.18 + P15.fix 3e2db704), which are
# not on main yet; until then it cannot be green (rule above).
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
# j_throttled_network drives patient-web in a real browser too (3G, 1% loss, offline banner). It reads NABD_PATIENT_WEB
# (default :3000, where nothing runs in the gate), so its browser half always skipped: point it at the site the gate
# serves for the j_web_* journeys (live-gate.yml, start-web.sh PATIENT_WEB_PORT=3100).
export NABD_PATIENT_WEB="${NABD_PATIENT_WEB:-${NABD_WEB_JOURNEYS_URL:-http://127.0.0.1:3100}}"
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
