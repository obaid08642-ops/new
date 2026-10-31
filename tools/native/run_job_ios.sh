#!/usr/bin/env bash
# Runs on the macOS runner: boot an iPhone simulator, install the unsigned .app, set the language to Arabic and run the Maestro
# flows (the same files as Android: tools/native/flows/<app>_<name>.yaml).
#   bash tools/native/run_job_ios.sh patient 2/6   |   bash tools/native/run_job_ios.sh provider lab
# Environment: NATIVE_FLOW as in run_job.sh (part of a flow name, "all" or "none"; default "login").
# The screen crawl (native_crawl.py) drives adb and is Android only; iOS runs the flows.
set -uo pipefail
TARGET="$1"; ARG="$2"
FLOW_FILTER="${NATIVE_FLOW:-login}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"
OUT=/tmp/native/out; mkdir -p "$OUT"
if [ "$TARGET" = patient ]; then PKG=com.patient.nabd; else PKG=com.nabd.provider; fi

DEVICE=$(xcrun simctl list devices available -j | python3 -c "
import json,sys
d=json.load(sys.stdin)['devices']
phones=[(rt,x) for rt,xs in d.items() if 'iOS' in rt for x in xs if x['name'].startswith('iPhone')]
phones.sort(key=lambda t:t[0])
print(phones[-1][1]['udid'])")
xcrun simctl boot "$DEVICE" 2>/dev/null || true
xcrun simctl bootstatus "$DEVICE" -b
# A cold simulator on a loaded runner needs 1-2 minutes of first-boot data migration; Maestro's XCTest driver must get as long
# ("iOS driver not ready in time" in run 97 at the default).
export MAESTRO_DRIVER_STARTUP_TIMEOUT=300000
rm -rf /tmp/native/app && mkdir -p /tmp/native/app && ditto -x -k "/tmp/native/${TARGET}-app.app.zip" /tmp/native/app
xcrun simctl install "$DEVICE" /tmp/native/app/*.app
xcrun simctl spawn "$DEVICE" defaults write "$PKG" AppleLanguages -array ar
xcrun simctl spawn "$DEVICE" defaults write "$PKG" AppleLocale ar_SA

ACC=/tmp/native/accounts.json
if [ "$TARGET" = patient ]; then
  EMAIL=$(python3 -c "import json;print(json.load(open('$ACC'))['patient']['email'])"); PASS=$(python3 -c "import json;print(json.load(open('$ACC'))['patient']['password'])")
  TAG="ios_patient_${ARG/\//of}"
else
  EMAIL=$(python3 -c "import json;print(json.load(open('$ACC'))['providers'].get('$ARG',{}).get('email',''))"); PASS=$(python3 -c "import json;print(json.load(open('$ACC'))['providers'].get('$ARG',{}).get('password',''))")
  TAG="ios_provider_$ARG"
fi

shopt -s nullglob
for FLOW in tools/native/flows/${TARGET}_*.yaml; do
  NAME=$(basename "$FLOW" .yaml); NAME=${NAME#${TARGET}_}
  case "$FLOW_FILTER" in none) continue ;; all) ;; *) [[ "$NAME" == *"$FLOW_FILTER"* ]] || continue ;; esac
  if [ -z "$EMAIL" ]; then echo "no seeded account for $TARGET $ARG" > "$OUT/flow_${TAG}__${NAME}.txt"; continue; fi
  run_flow() { "$HOME/.maestro/bin/maestro" --device "$DEVICE" test -e EMAIL="$EMAIL" -e PASSWORD="$PASS" --test-output-dir "$OUT/maestro_${TAG}__${NAME}" "$FLOW" > "$OUT/maestro_${TAG}__${NAME}.log" 2>&1; }
  # one retry, and only when Maestro's driver itself did not start (before any step ran); a failed step is never retried
  if run_flow || { grep -q "iOS driver not ready in time" "$OUT/maestro_${TAG}__${NAME}.log" && { echo "maestro driver did not start, retrying once"; run_flow; }; }; then
    echo ok > "$OUT/flow_${TAG}__${NAME}.txt"
  else
    echo "maestro flow failed (see maestro_${TAG}__${NAME}.log and its screenshots)" > "$OUT/flow_${TAG}__${NAME}.txt"
  fi
done
# say what happened in the job log too, and fail the job when a flow failed (the report job still merges every result)
FAILED=0
for R in "$OUT"/flow_${TAG}__*.txt; do
  N=$(basename "$R" .txt); N=${N#flow_${TAG}__}
  echo "flow $N: $(cat "$R")"
  if [ "$(cat "$R")" != ok ]; then
    FAILED=1; echo "----- tail of maestro_${TAG}__${N}.log"; tail -n 60 "$OUT/maestro_${TAG}__${N}.log" 2>/dev/null || true
    # what the simulator shows now (every text and id on the screen) and what the backend saw: tells an error message or a stuck
    # button from a request that never arrived
    echo "----- screen texts at the end of the flow"
    "$HOME/.maestro/bin/maestro" --device "$DEVICE" hierarchy 2>/dev/null | python3 -c "
import json,sys
raw=sys.stdin.read()
try: tree=json.loads(raw[raw.index('{'):])
except Exception: print(raw[:1500]); sys.exit()
seen=[]
def walk(n):
    a=n.get('attributes',n)
    for k in ('text','accessibilityText','hintText','resource-id'):
        v=a.get(k)
        if v and v not in seen: seen.append(v)
    for c in n.get('children',[]): walk(c)
walk(tree); print(' | '.join(seen)[:2500])" || true
    echo "----- backend log, auth requests"; grep -i -E "auth|login" /tmp/nabd-backend.log 2>/dev/null | tail -n 25 || true
  fi
done
xcrun simctl spawn "$DEVICE" log show --last 10m --predicate 'process == "'"$(basename /tmp/native/app/*.app .app)"'" AND messageType == error' > "$OUT/syslog_errors_$TAG.txt" 2>/dev/null || true
exit $FAILED
