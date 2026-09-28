#!/usr/bin/env bash
# Live gate: run the fully-green journeys against a running stack and fail on any failed step.
#   bash tools/live/run_gate.sh            (backend :8002, admin BFF :3001, smtp_sink :2525, fake_moyasar :9100)
# A journey joins this list once it is 100% green; open findings (docs/audit/03_LIVE_JOURNEY_FINDINGS.md)
# keep theirs out until fixed.
set -uo pipefail
cd "$(dirname "$0")"
JOURNEYS=(j_accounts j_onboarding j_pharmacy j_lab j_radiology j_nursing j_consultation j_ambulance j_facility j_support j_loyalty)
fail=0
# one admin 2FA login per gate run (the login endpoint is rate limited per IP)
export LIVE_ADMIN_SESSION="$(mktemp)"; rm -f "$LIVE_ADMIN_SESSION"
python3 gate_p1.py || fail=1
for j in "${JOURNEYS[@]}"; do
  out=$(timeout 1200 python3 "$j.py" 2>&1)
  line=$(grep -E '^##### ' <<<"$out" | tail -1)
  echo "$j: ${line:-no summary (crashed)}"
  if [[ -z $line || ! $line =~ ", 0 failed" ]]; then
    fail=1
    grep -E '^\s+FAIL|Traceback|Error' <<<"$out" | head -20
  fi
done
# R6-9: admin per-page click tests (real Chromium; skips cleanly without a browser or seed data).
out=$(timeout 1800 python3 j_admin_clicks.py 2>&1)
line=$(grep -E '^##### ' <<<"$out" | tail -1)
echo "j_admin_clicks: ${line:-no summary (crashed)}"
if [[ -z $line || ! $line =~ ", 0 failed" ]]; then
  fail=1
  grep -E '^\s+FAIL|Traceback|Error' <<<"$out" | head -20
fi
exit $fail
