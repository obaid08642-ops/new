#!/usr/bin/env bash
# Runs inside the Android emulator job: install the APK, set the app language to Arabic, run the Maestro flows, then (optionally) crawl.
#   bash tools/native/run_job.sh patient 2/6   |   bash tools/native/run_job.sh provider lab
# Environment (set by .github/workflows/native-e2e.yml):
#   NATIVE_FLOW   which Maestro flows of the app to run: part of a file name in tools/native/flows (default "login"), or "all", or "none"
#   NATIVE_CRAWL  "true" crawls every screen after the flows (slow); anything else skips the crawl (default "true")
# A flow can have a setup step (tools/native/setup/<app>_<name>.py, see below). The sign-in flow ("login") is also what signs the crawler in, so the crawl needs it among the flows that ran.
set -uo pipefail
TARGET="$1"; ARG="$2"
FLOW_FILTER="${NATIVE_FLOW:-login}"; CRAWL="${NATIVE_CRAWL:-true}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"
OUT=/tmp/native/out; mkdir -p "$OUT"
if [ "$TARGET" = patient ]; then PKG=com.patient.nabd; APK=/tmp/native/patient-app.apk; else PKG=com.nabd.provider; APK=/tmp/native/provider-app.apk; fi
adb wait-for-device
adb install -r "$APK"   # no -g: runtime permission prompts must really appear (the crawler records and answers them)
adb shell cmd locale set-app-locales "$PKG" --locales ar-SA || true
adb shell settings put system screen_off_timeout 1800000
adb shell am force-stop com.google.android.apps.nexuslauncher 2>/dev/null; adb shell pm disable-user --user 0 com.google.android.apps.nexuslauncher 2>/dev/null || true   # the launcher is not under test and freezes the emulator under load
adb shell settings put global window_animation_scale 0; adb shell settings put global transition_animation_scale 0; adb shell settings put global animator_duration_scale 0

ACC=/tmp/native/accounts.json
if [ "$TARGET" = patient ]; then
  EMAIL=$(python3 -c "import json;print(json.load(open('$ACC'))['patient']['email'])"); PASS=$(python3 -c "import json;print(json.load(open('$ACC'))['patient']['password'])")
  TAG="patient_${ARG/\//of}"
else
  EMAIL=$(python3 -c "import json;print(json.load(open('$ACC'))['providers'].get('$ARG',{}).get('email',''))"); PASS=$(python3 -c "import json;print(json.load(open('$ACC'))['providers'].get('$ARG',{}).get('password',''))")
  TAG="provider_$ARG"
fi

# The flows of this app: tools/native/flows/<app>_<name>.yaml, narrowed by NATIVE_FLOW. One result file per flow:
# flow_<TAG>__<name>.txt = "ok", or why it failed (the Maestro log and screenshots are in maestro_<TAG>__<name>).
LOGIN_OK=no
shopt -s nullglob
for FLOW in tools/native/flows/${TARGET}_*.yaml; do
  NAME=$(basename "$FLOW" .yaml); NAME=${NAME#${TARGET}_}
  case "$FLOW_FILTER" in none) continue ;; all) ;; *) [[ "$NAME" == *"$FLOW_FILTER"* ]] || continue ;; esac
  if [ -z "$EMAIL" ]; then echo "no seeded account for $TARGET $ARG" > "$OUT/flow_${TAG}__${NAME}.txt"; continue; fi
  # A flow may have a setup step, tools/native/setup/<app>_<name>.py (it acts through the real APIs before the flow, e.g. the doctor writes a
  # chat message); it prints a JSON object whose entries reach the flow as -e variables. DOCTOR_MSG / APP_MSG are the texts of the chat flow.
  EXTRA=(-e "DOCTOR_MSG=doctor-e2e-$(date +%s)" -e "APP_MSG=patient-e2e-$(date +%s)")
  SETUP="tools/native/setup/${TARGET}_${NAME}.py"
  if [ -f "$SETUP" ]; then
    DOCTOR_MSG="doctor-e2e-$(date +%s)"; EXTRA=(-e "DOCTOR_MSG=$DOCTOR_MSG" -e "APP_MSG=patient-e2e-$(date +%s)")
    if SETUP_OUT=$(python3 "$SETUP" "$ACC" "$DOCTOR_MSG" 2> "$OUT/setup_${TAG}__${NAME}.log"); then
      while IFS= read -r KV; do EXTRA+=(-e "$KV"); done < <(printf '%s' "$SETUP_OUT" | python3 -c "import json,sys;[print(k+'='+str(v)) for k,v in json.loads(sys.stdin.read().strip().splitlines()[-1]).items()]")
    else
      echo "setup failed: $(tail -n 3 "$OUT/setup_${TAG}__${NAME}.log" | tr '\n' ' ')" > "$OUT/flow_${TAG}__${NAME}.txt"; cat "$OUT/setup_${TAG}__${NAME}.log"; continue
    fi
  fi
  if "$HOME/.maestro/bin/maestro" test -e EMAIL="$EMAIL" -e PASSWORD="$PASS" ${EXTRA[@]+"${EXTRA[@]}"} --test-output-dir "$OUT/maestro_${TAG}__${NAME}" "$FLOW" > "$OUT/maestro_${TAG}__${NAME}.log" 2>&1; then
    echo ok > "$OUT/flow_${TAG}__${NAME}.txt"; [ "$NAME" = login ] && LOGIN_OK=yes
  else
    echo "maestro flow failed (see maestro_${TAG}__${NAME}.log and its screenshots)" > "$OUT/flow_${TAG}__${NAME}.txt"
    # the screen as it is when this flow stopped (printed in the report below)
    "$HOME/.maestro/bin/maestro" hierarchy 2>/dev/null | python3 -c "
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
walk(tree); print(' | '.join(seen)[:2500])" > "$OUT/screen_${TAG}__${NAME}.txt" || true
    # what the app and the backend said while this flow ran (the end-of-job tail below covers only the last flow): failed requests, and the app's own JS log
    {
      echo "backend, requests that failed (4xx/5xx), last 15:"; grep -E '"status":(4|5)[0-9][0-9]' /tmp/nabd-backend.log 2>/dev/null | tail -n 15 | python3 -c "
import json,sys
for l in sys.stdin:
    try: j=json.loads(l); print(j.get('ts'), j.get('status'), j.get('route'), 'user' if j.get('user_id') else 'no-user')
    except Exception: print(l[:200].rstrip())"
      echo "app JS log (ReactNativeJS), last 40:"; adb logcat -d -v time ReactNativeJS:V '*:S' 2>/dev/null | tail -n 40 | cut -c1-300
    } > "$OUT/diag_${TAG}__${NAME}.txt" 2>&1 || true
  fi
  adb shell am force-stop dev.mobile.maestro 2>/dev/null; adb shell am force-stop dev.mobile.maestro.test 2>/dev/null
done

# say what happened in the job log too, and fail the job when a flow failed (the report job still merges every result)
FAILED=0
for R in "$OUT"/flow_${TAG}__*.txt; do
  N=$(basename "$R" .txt); N=${N#flow_${TAG}__}
  echo "flow $N: $(cat "$R")"
  if [ "$(cat "$R")" != ok ]; then
    FAILED=1; echo "----- tail of maestro_${TAG}__${N}.log"; tail -n 60 "$OUT/maestro_${TAG}__${N}.log" 2>/dev/null || true
    # every text and id on the screen now: tells an error message or a stuck button from a screen that never opened
    echo "----- screen texts when the flow stopped"
    cat "$OUT/screen_${TAG}__${N}.txt" 2>/dev/null || true
    # a dump that shows only system UI means the app left the foreground: a crash says why
    echo "----- app crash log (adb, crash buffer and fatal errors)"
    adb logcat -d -b crash -v time 2>/dev/null | tail -n 40 || true
    adb logcat -d -v time 2>/dev/null | grep -E "FATAL EXCEPTION|ReactNativeJS.*(Error|error)|AndroidRuntime|Process com.patient.nabd .* has died|ANR in com.patient.nabd" | tail -n 30 || true
    echo "----- what the backend and the app said during this flow"; cat "$OUT/diag_${TAG}__${N}.txt" 2>/dev/null || true
    echo "----- backend log, last requests"; tail -n 25 /tmp/nabd-backend.log 2>/dev/null || true
  fi
done

if [ "$CRAWL" = true ]; then
  if [ "$LOGIN_OK" != yes ]; then echo "the crawl runs signed out: the login flow did not run or did not pass" > "$OUT/crawl_${TAG}.txt"; fi
  if [ "$TARGET" = patient ]; then
    python3 tools/native/native_crawl.py patient --routes /tmp/native/routes.json --shard "$ARG" --out "$OUT"
  else
    python3 tools/native/native_crawl.py provider --ptype "$ARG" --out "$OUT"
  fi
fi
adb logcat -d -v time '*:E' > "$OUT/logcat_errors_$TAG.txt" 2>/dev/null || true
exit $FAILED
