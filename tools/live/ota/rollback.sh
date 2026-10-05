#!/usr/bin/env bash
# P15.12 instant OTA rollback: point the channel back at the last-good update
# group. Same BLOCKED execution as the rollout (needs EXPO_TOKEN + a real
# binary); probed, not assumed: prefers `eas update:republish` when the
# installed eas-cli offers it, otherwise prints the manual runbook and exits
# NON-ZERO — the manual path is never silent and never reported as a success.
#
#   EXPO_TOKEN=... APP_DIR=patient-app LAST_GOOD=<group-id> bash tools/live/ota/rollback.sh
set -uo pipefail
: "${EXPO_TOKEN:?set EXPO_TOKEN (Expo access token)}"
: "${APP_DIR:?set APP_DIR (patient-app or provider-app)}"
: "${LAST_GOOD:?set LAST_GOOD (last-good update group id)}"
cd "$APP_DIR"
command -v eas >/dev/null 2>&1 || { echo "install eas-cli first: npm i -g eas-cli" >&2; exit 1; }
echo "eas: $(eas --version 2>&1 | head -1)"

if eas update:republish --help >/dev/null 2>&1; then
  # Claim success only when eas actually succeeded: a failing republish that
  # still printed "rolled back" is the worst possible lie during an incident.
  # ($? is captured immediately — an `if` whose condition is false reports 0.)
  eas update:republish --group "$LAST_GOOD" --branch production-full --non-interactive
  rc=$?
  if [[ $rc -eq 0 ]]; then
    echo "rolled production-full back to group $LAST_GOOD"
    exit 0
  fi
  echo "!! AUTOMATED ROLLBACK FAILED (rc=$rc) — production-full still points wherever it pointed before." >&2
  echo "!! Fall back to the manual runbook below NOW; do not close the incident." >&2
else
  echo "!! MANUAL ROLLBACK REQUIRED — this eas-cli has no 'update:republish'." >&2
fi

# Manual runbook. Every verb it names is probed first, so the operator is never
# told to run a command this cli does not have.
missing=()
for verb in "update:list" "channel:edit" "channel:view"; do
  eas $verb --help >/dev/null 2>&1 || missing+=("$verb")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "!! The manual runbook cannot be executed as written: this eas-cli is missing ${missing[*]}." >&2
  echo "!! Check 'eas --help' / 'eas update --help' for the equivalent verbs and record them here." >&2
else
  cat <<EOF
Manual instant rollback on $(eas --version 2>&1 | head -1):
  1. eas update:list --branch production-full   # find the last-good group id
  2. eas channel:edit production --branch <branch-holding-$LAST_GOOD>
  3. Confirm: eas channel:view production shows the last-good branch.
Target group for this incident: $LAST_GOOD
EOF
fi
exit 1