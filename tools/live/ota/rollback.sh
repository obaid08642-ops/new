#!/usr/bin/env bash
# P15.12 instant OTA rollback: point the channel back at the last-good update
# group. Same BLOCKED execution as the rollout (needs EXPO_TOKEN + a real
# binary); probed, not assumed: prefers `eas update:republish` when the
# installed eas-cli offers it, otherwise prints the manual runbook.
#
#   EXPO_TOKEN=... APP_DIR=patient-app LAST_GOOD=<group-id> bash tools/live/ota/rollback.sh
set -uo pipefail
: "${EXPO_TOKEN:?set EXPO_TOKEN (Expo access token)}"
: "${APP_DIR:?set APP_DIR (patient-app or provider-app)}"
: "${LAST_GOOD:?set LAST_GOOD (last-good update group id)}"
cd "$APP_DIR"
command -v eas >/dev/null 2>&1 || { echo "install eas-cli first: npm i -g eas-cli" >&2; exit 1; }
echo "eas: $(eas --version)"
if eas update:republish --help >/dev/null 2>&1; then
  eas update:republish --group "$LAST_GOOD" --branch production-full --non-interactive
  echo "rolled production-full back to group $LAST_GOOD"
else
  cat <<EOF
This eas-cli has no 'update:republish'. Manual instant rollback:
  1. eas update:list --branch production-full   # find the last-good group id
  2. eas channel:edit production --branch <branch-holding-$LAST_GOOD>
  3. Confirm: eas channel:view production shows the last-good branch.
Target group for this incident: $LAST_GOOD
EOF
  exit 1
fi
