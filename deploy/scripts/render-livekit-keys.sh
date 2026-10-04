#!/usr/bin/env bash
# Q87: write the single LiveKit API key into livekit.yaml's `keys:` block.
#   LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=... bash render-livekit-keys.sh path/to/livekit.yaml
# Every entry under `keys:` is replaced by exactly one line, the real key. The
# committed template line `${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}` must never
# survive: LiveKit would read it as a second key whose secret is public.
# awk reads the values from ENVIRON, so characters such as | & / in the secret
# need no escaping. Fails when a value is missing or a `${` placeholder remains.
set -euo pipefail
FILE="$1"
: "${LIVEKIT_API_KEY:?LIVEKIT_API_KEY is required}"
: "${LIVEKIT_API_SECRET:?LIVEKIT_API_SECRET is required}"
TMP="$(mktemp)"
awk '
  /^keys:[[:space:]]*$/ { print; print "  " ENVIRON["LIVEKIT_API_KEY"] ": " ENVIRON["LIVEKIT_API_SECRET"]; inkeys = 1; next }
  inkeys && /^[[:space:]]+[^[:space:]#]/ { next }
  inkeys && /^[^[:space:]]/ { inkeys = 0 }
  { print }
' "$FILE" > "$TMP"
if grep -q '\${' "$TMP"; then
  echo "render-livekit-keys: a \${...} placeholder is still in $FILE" >&2
  rm -f "$TMP"; exit 1
fi
if [ "$(grep -c "^  ${LIVEKIT_API_KEY}: " "$TMP")" != 1 ]; then
  echo "render-livekit-keys: expected exactly one key line" >&2
  rm -f "$TMP"; exit 1
fi
cat "$TMP" > "$FILE"
rm -f "$TMP"
