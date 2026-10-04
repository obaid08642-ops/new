#!/usr/bin/env bash
# Runs inside the Android emulator job: install the APK, set the app language to Arabic, sign in with the
# Maestro flow, then crawl.   bash tools/native/run_job.sh patient 2/6   |   bash tools/native/run_job.sh provider lab
set -uo pipefail
TARGET="$1"; ARG="$2"
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
  FLOW=tools/native/flows/patient_login.yaml; TAG="patient_${ARG/\//of}"
else
  EMAIL=$(python3 -c "import json;print(json.load(open('$ACC'))['providers'].get('$ARG',{}).get('email',''))"); PASS=$(python3 -c "import json;print(json.load(open('$ACC'))['providers'].get('$ARG',{}).get('password',''))")
  FLOW=tools/native/flows/provider_login.yaml; TAG="provider_$ARG"
fi
if [ -z "$EMAIL" ]; then echo "no seeded account for $TARGET $ARG" > "$OUT/login_$TAG.txt";
elif "$HOME/.maestro/bin/maestro" test -e EMAIL="$EMAIL" -e PASSWORD="$PASS" --test-output-dir "$OUT/maestro_$TAG" "$FLOW" > "$OUT/maestro_$TAG.log" 2>&1; then echo ok > "$OUT/login_$TAG.txt";
else echo "maestro login flow failed (see maestro_$TAG.log and its screenshots)" > "$OUT/login_$TAG.txt"; fi
adb shell am force-stop dev.mobile.maestro 2>/dev/null; adb shell am force-stop dev.mobile.maestro.test 2>/dev/null

if [ "$TARGET" = patient ]; then
  python3 tools/native/native_crawl.py patient --routes /tmp/native/routes.json --shard "$ARG" --out "$OUT"
else
  python3 tools/native/native_crawl.py provider --ptype "$ARG" --out "$OUT"
fi
adb logcat -d -v time '*:E' > "$OUT/logcat_errors_$TAG.txt" 2>/dev/null || true
exit 0
