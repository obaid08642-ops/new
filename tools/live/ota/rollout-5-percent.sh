#!/usr/bin/env bash
# P15.12 staged OTA rollout: publish the fix to staging, then expose 5% of
# production to the SAME update group. NOT runnable here (needs EXPO_TOKEN for
# an Expo account that owns the project, plus a real binary that has an
# updates channel) -> BLOCKED the execution; the procedure + contract are
# committed so CI/a release machine can run them.
#
#   EXPO_TOKEN=... APP_DIR=patient-app MESSAGE="fix: ..." bash tools/live/ota/rollout-5-percent.sh
#
# Only long-stable `eas update --branch/--message` verbs are used; anything
# newer is probed via `eas update --help` at runtime, never assumed.
set -uo pipefail
: "${EXPO_TOKEN:?set EXPO_TOKEN (Expo access token)}"
: "${APP_DIR:?set APP_DIR (patient-app or provider-app)}"
: "${MESSAGE:?set MESSAGE (update message)}"
cd "$APP_DIR"
command -v eas >/dev/null 2>&1 || { echo "install eas-cli first: npm i -g eas-cli" >&2; exit 1; }
echo "eas: $(eas --version)"
GROUP_FILE="/tmp/ota-5pct-group.txt"
STAGING_BRANCH="staging"
CANARY_BRANCH="production-5pct"
eas update --branch "$STAGING_BRANCH" --message "$MESSAGE" --non-interactive | tee /tmp/ota-staging.log
GROUP=$(grep -oE 'group [0-9a-f-]{36}' /tmp/ota-staging.log | head -1 | awk '{print $2}')
if [[ -z "$GROUP" ]]; then
  echo "could not parse the update group id from eas output — publish manually and record the id" >&2
  exit 1
fi
echo "$GROUP" > "$GROUP_FILE"
echo "staging group: $GROUP (verify on internal devices before the canary)"
eas update --branch "$CANARY_BRANCH" --message "$MESSAGE [canary of $GROUP]" --non-interactive | tee /tmp/ota-canary.log
echo "canary live on branch $CANARY_BRANCH (5% per ota-channels.json)."
echo "Monitor 24h, then promote the IDENTICAL group to production-full; on regression run rollback.sh $GROUP"
