#!/usr/bin/env bash
# Runs inside the Android emulator job: install the APK, set the app language to Arabic, run the Maestro flows, then (optionally) crawl.
#   bash tools/native/run_job.sh patient 2/6   |   bash tools/native/run_job.sh provider lab
# Environment (set by .github/workflows/native-e2e.yml):
#   NATIVE_FLOW   which Maestro flows of the app to run: part of a file name in tools/native/flows (default "login"), or "all", or "none"
#   NATIVE_CRAWL  "true" crawls every screen after the flows (slow); anything else skips the crawl (default "true")
# The sign-in flow ("login") is also what signs the crawler in, so the crawl needs it among the flows that ran.
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
  # the pharmacy that stocks the seeded medicines (and is online) is the one the pharmacy flows sign in as
  KEY="$ARG"; [ "$ARG" = pharmacy ] && KEY=pharmacy_stock
  EMAIL=$(python3 -c "import json;a=json.load(open('$ACC'))['providers'];print((a.get('$KEY') or a.get('$ARG') or {}).get('email',''))"); PASS=$(python3 -c "import json;a=json.load(open('$ACC'))['providers'];print((a.get('$KEY') or a.get('$ARG') or {}).get('password',''))")
  TAG="provider_$ARG"
fi

# Helper the flows call from runScript (fresh sign-up data, mailed OTP codes, a throwaway patient): tools/native/helper.py
HELPER_PORT=9300
nohup python3 tools/native/helper.py "$HELPER_PORT" > "$OUT/helper.log" 2>&1 &
HELPER_PID=$!
sleep 1

# The flows of this app: tools/native/flows/<app>_<name>.yaml, narrowed by NATIVE_FLOW. One result file per flow:
# flow_<TAG>__<name>.txt = "ok", or why it failed (the Maestro log and screenshots are in maestro_<TAG>__<name>).
LOGIN_OK=no
shopt -s nullglob
for FLOW in tools/native/flows/${TARGET}_*.yaml; do
  NAME=$(basename "$FLOW" .yaml); NAME=${NAME#${TARGET}_}
  # provider_<type>_<name>.yaml belongs to that provider type only (provider_<name>.yaml runs for every type)
  for T in pharmacy doctor lab radiology home_care hospital; do
    if [ "$TARGET" = provider ] && [[ "$NAME" == ${T}_* ]] && [ "$ARG" != "$T" ]; then continue 2; fi
  done
  case "$FLOW_FILTER" in none) continue ;; all) ;; *) [[ "$NAME" == *"$FLOW_FILTER"* ]] || continue ;; esac
  if [ -z "$EMAIL" ]; then echo "no seeded account for $TARGET $ARG" > "$OUT/flow_${TAG}__${NAME}.txt"; continue; fi
  if "$HOME/.maestro/bin/maestro" test -e EMAIL="$EMAIL" -e PASSWORD="$PASS" -e HELPER="http://127.0.0.1:$HELPER_PORT" --test-output-dir "$OUT/maestro_${TAG}__${NAME}" "$FLOW" > "$OUT/maestro_${TAG}__${NAME}.log" 2>&1; then
    echo ok > "$OUT/flow_${TAG}__${NAME}.txt"; [ "$NAME" = login ] && LOGIN_OK=yes
  else
    echo "maestro flow failed (see maestro_${TAG}__${NAME}.log and its screenshots)" > "$OUT/flow_${TAG}__${NAME}.txt"
  fi
  adb shell am force-stop dev.mobile.maestro 2>/dev/null; adb shell am force-stop dev.mobile.maestro.test 2>/dev/null
done

if [ "$CRAWL" = true ]; then
  if [ "$LOGIN_OK" != yes ]; then echo "the crawl runs signed out: the login flow did not run or did not pass" > "$OUT/crawl_${TAG}.txt"; fi
  if [ "$TARGET" = patient ]; then
    python3 tools/native/native_crawl.py patient --routes /tmp/native/routes.json --shard "$ARG" --out "$OUT"
  else
    python3 tools/native/native_crawl.py provider --ptype "$ARG" --out "$OUT"
  fi
fi
kill "$HELPER_PID" 2>/dev/null || true
adb logcat -d -v time '*:E' > "$OUT/logcat_errors_$TAG.txt" 2>/dev/null || true
exit 0
