#!/usr/bin/env bash
# P15.10 device-farm runner (Firebase Test Lab). Runnable from CI or a laptop
# with gcloud + farm credentials; the farm run itself is EXTERNAL and paid.
#
#   GCLOUD_PROJECT=nabd-plus RESULTS_BUCKET=gs://nabd-ftl \
#     bash tools/live/run_device_farm.sh --apk /path/to/patient.apk [--ipa /path/to/patient.ipa] [--out /tmp/ftl.json]
#
# Android leg: Robo crawl over the matrix in device_farm.yml (no test code
# needed). Every pinned model is validated against the live FTL catalog first:
# a retired model fails loudly instead of silently shrinking coverage. iOS
# needs an XCUITest bundle next to the .ipa (FTL has no iOS Robo); without one
# the iOS leg reports BLOCKED with the exact pending command.
set -uo pipefail
cd "$(dirname "$0")"

APK=""; IPA=""; OUT="/tmp/ftl-report.json"; MATRIX="device_farm.yml"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --apk) APK="$2"; shift 2;;
    --ipa) IPA="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    *) echo "usage: $0 --apk <apk> [--ipa <ipa>] [--out <json>] (needs GCLOUD_PROJECT, RESULTS_BUCKET)" >&2; exit 2;;
  esac
done
: "${GCLOUD_PROJECT:?set GCLOUD_PROJECT}" "${RESULTS_BUCKET:?set RESULTS_BUCKET}"
command -v gcloud >/dev/null 2>&1 || { echo "BLOCKED: gcloud CLI not installed" >&2; exit 1; }
[[ -n "$APK" && -f "$APK" ]] || { echo "BLOCKED: EAS-built APK missing (EAS build needs an Expo account with billing)" >&2; exit 1; }

catalog=$(gcloud firebase test android models list --format='value(id)' 2>/dev/null) || { echo "BLOCKED: gcloud not authenticated to $GCLOUD_PROJECT" >&2; exit 1; }
models=$(python3 - "$MATRIX" <<'EOF'
import sys
try:
    import yaml
except ImportError:
    print('pyyaml-missing'); raise SystemExit
m = yaml.safe_load(open(sys.argv[1])) or {}
for d in (m.get('android') or {}).get('models', []):
    print(f"{d['model']},{d.get('version')},{d.get('locale','en_US')},{d.get('orientation','portrait')}")
EOF
)
[[ "$models" != *"pyyaml-missing"* ]] || { echo "BLOCKED: python3-yaml needed to read $MATRIX" >&2; exit 1; }
# Fail closed on an empty matrix: with no rows both the validation loop and the
# Robo loop below are skipped, `results` stays empty, fails=0 and the run exits 0
# having covered ZERO devices — a report that reads like a pass.
stripped="$(printf '%s' "$models" | tr -d '[:space:]')"
if [[ -z "$stripped" ]]; then
  echo "BLOCKED: $MATRIX parsed to an EMPTY device matrix — 0 devices would run and the report would read as a pass" >&2
  exit 1
fi
echo "matrix rows to run: $(grep -c . <<<"$models")"
for row in $models; do
  id="${row%%,*}"
  grep -qx "$id" <<<"$catalog" || { echo "BLOCKED: FTL model '$id' not in the live catalog — update device_farm.yml" >&2; exit 1; }
done
echo "models validated against the live FTL catalog"

results=()
for row in $models; do
  id="${row%%,*}"; rest="${row#*,}"; ver="${rest%%,*}"; rest="${rest#*,}"; loc="${rest%%,*}"; ori="${rest##*,}"
  echo "== robo $id android-$ver $loc $ori =="
  if gcloud firebase test android run --project "$GCLOUD_PROJECT" --app "$APK" --type robo \
      --device "model=$id,version=$ver,locale=$loc,orientation=$ori" \
      --timeout 15m --results-bucket "$RESULTS_BUCKET" --results-dir "p15-$(date +%F)-$id"; then
    results+=("{\"model\":\"$id\",\"status\":\"pass\"}")
  else
    results+=("{\"model\":\"$id\",\"status\":\"fail\"}")
  fi
done
fails=$(printf '%s\n' "${results[@]}" | grep -c '"status":"fail"' || true)
{ echo -n '{"date":"'; date +%F; echo -n '","android":['; IFS=,; echo -n "${results[*]}"; echo "],\"ios\":\"BLOCKED: needs .ipa (EAS/Expo account) + XCUITest bundle; rerun with --ipa and a test bundle per device_farm.yml\"}"; } > "$OUT"
echo "report: $OUT"
[[ "$fails" == "0" ]] || { echo "$fails Android model(s) FAILED — 0 blocking issues required per release" >&2; exit 1; }
echo "device farm: 0 blocking issues on Android; iOS pending (see report)"
