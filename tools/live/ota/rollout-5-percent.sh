#!/usr/bin/env bash
# P15.12 staged OTA rollout: publish the fix to staging, then expose 5% of
# production to the SAME update group. NOT runnable here (needs EXPO_TOKEN for
# an Expo account that owns the project, plus a real binary that has an
# updates channel) -> BLOCKED the execution; the procedure + contract are
# committed so CI/a release machine can run them.
#
#   EXPO_TOKEN=... APP_DIR=patient-app MESSAGE="fix: ..." bash tools/live/ota/rollout-5-percent.sh
#
# Only long-stable `eas update` verbs are used; anything newer is probed via
# `eas update --help` at runtime, never assumed. The group id is read from
# `--json` output when the INSTALLED eas-cli documents that flag, and from the
# human-readable text only as a fallback; either way a shape the parser does not
# recognise is a loud non-zero exit, never a silently invented id.
set -uo pipefail
: "${EXPO_TOKEN:?set EXPO_TOKEN (Expo access token)}"
: "${APP_DIR:?set APP_DIR (patient-app or provider-app)}"
: "${MESSAGE:?set MESSAGE (update message)}"
cd "$APP_DIR"
command -v eas >/dev/null 2>&1 || { echo "install eas-cli first: npm i -g eas-cli" >&2; exit 1; }
echo "eas: $(eas --version 2>&1 | head -1)"
GROUP_FILE="/tmp/ota-5pct-group.txt"
STAGING_BRANCH="staging"
CANARY_BRANCH="production-5pct"
UUID_RE='[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

# Probe the INSTALLED cli instead of assuming its surface. (Verified on the
# version in this repo's toolchain: `eas update --json` exists there, but the
# flag is checked at run time because eas-cli moves.)
EAS_UPDATE_HELP="$(eas update --help 2>&1 || true)"
if grep -q -- '--json' <<<"$EAS_UPDATE_HELP"; then
  JSON_MODE=1
else
  JSON_MODE=0
  echo "note: this eas-cli does not document --json for 'eas update' — using the text parser (a format change fails loudly below)"
fi

# publish <branch> <message> <logfile>: echoes nothing, returns eas's own status.
publish() {
  local branch="$1" message="$2" log="$3" rc
  local args=(--branch "$branch" --message "$message" --non-interactive)
  [[ "$JSON_MODE" == "1" ]] && args+=(--json)
  eas update "${args[@]}" 2>&1 | tee "$log"
  rc=${PIPESTATUS[0]}
  if [[ $rc -ne 0 ]]; then
    echo "eas update FAILED (rc=$rc) on branch '$branch' — nothing was published; see $log" >&2
  fi
  return "$rc"
}

# Strict JSON read: the first uuid-shaped value under an id-ish key. Exits 3
# when the output is not JSON at all and 4 when it is JSON without an id.
group_from_json() {
  python3 - "$1" <<'PY'
import json, re, sys
UUID = re.compile(r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
KEYS = ('id', 'group', 'groupId', 'group_id', 'updateGroupId', 'update_group_id')
raw = open(sys.argv[1], encoding='utf8', errors='replace').read()
try:
    data = json.loads(raw)
except ValueError:
    sys.exit(3)


def walk(node):
    if isinstance(node, dict):
        for k, v in node.items():
            if k in KEYS and isinstance(v, str) and UUID.fullmatch(v.strip()):
                return v.strip()
            hit = walk(v)
            if hit:
                return hit
    elif isinstance(node, list):
        for v in node:
            hit = walk(v)
            if hit:
                return hit
    return None


hit = walk(data)
if not hit:
    sys.exit(4)
print(hit)
PY
}

# Legacy text parser, kept only for eas-cli builds without --json. The UUID is
# anchored to the word "group" so an unrelated uuid in the output cannot be
# mistaken for the update group.
group_from_text() {
  grep -oE "group ($UUID_RE)" "$1" | head -1 | awk '{print $2}'
}

if ! publish "$STAGING_BRANCH" "$MESSAGE" /tmp/ota-staging.log; then
  exit 1
fi
GROUP=''
GROUP_MODE_TEXT='--json'
if [[ "$JSON_MODE" == "1" ]]; then
  GROUP="$(group_from_json /tmp/ota-staging.log)" || GROUP=''
  if [[ -z "$GROUP" ]]; then
    echo "note: --json output carried no usable update group id — falling back to the text parser" >&2
  fi
fi
[[ -n "$GROUP" ]] || {
  GROUP="$(group_from_text /tmp/ota-staging.log || true)"
  GROUP_MODE_TEXT='text output ("group <uuid>")'
}
if [[ -z "$GROUP" ]]; then
  echo "FORMAT MISMATCH: no update group id could be read out of the 'eas update' output." >&2
  echo "  eas version : $(eas --version 2>&1 | head -1)" >&2
  echo "  json mode   : $JSON_MODE (does 'eas update --help' document --json here?)" >&2
  echo "  first lines of /tmp/ota-staging.log:" >&2
  head -20 /tmp/ota-staging.log >&2
  echo "  do NOT guess the id: publish manually and record it (tools/live/ota/ota-channels.json)." >&2
  exit 1
fi
echo "$GROUP" > "$GROUP_FILE"
echo "staging group: $GROUP (via $GROUP_MODE_TEXT from /tmp/ota-staging.log; verify on internal devices before the canary)"
if ! publish "$CANARY_BRANCH" "$MESSAGE [canary of $GROUP]" /tmp/ota-canary.log; then
  echo "staging is published but the 5% canary FAILED — do not promote; see /tmp/ota-canary.log" >&2
  exit 1
fi
echo "canary live on branch $CANARY_BRANCH (5% per ota-channels.json)."
echo "Monitor 24h, then promote the IDENTICAL group to production-full; on regression run rollback.sh $GROUP"