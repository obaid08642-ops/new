#!/usr/bin/env bash
# Q87 regression test: bash deploy/scripts/render-livekit-keys.test.sh  (exit 0 = pass)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
fail() { echo "FAIL: $*"; exit 1; }
cp "$HERE/../livekit/livekit.yaml" "$TMP/l.yaml"
# first deploy (committed template) with a secret containing sed-special characters
LIVEKIT_API_KEY=APIunitKey LIVEKIT_API_SECRET='s3cr|et&/x' bash "$HERE/render-livekit-keys.sh" "$TMP/l.yaml"
grep -q '\${' "$TMP/l.yaml" && fail "placeholder left"
[ "$(sed -n '/^keys:/,/^[^[:space:]#]/p' "$TMP/l.yaml" | grep -cE '^  [^[:space:]#][^:]*:')" = 1 ] || fail "not exactly one key"
grep -qxF '  APIunitKey: s3cr|et&/x' "$TMP/l.yaml" || fail "real key line missing"
grep -q '^turn:' "$TMP/l.yaml" || fail "sections after keys were lost"
# re-deploy with a rotated key replaces the old one
LIVEKIT_API_KEY=APIrotated LIVEKIT_API_SECRET=newSecret bash "$HERE/render-livekit-keys.sh" "$TMP/l.yaml"
grep -q 'APIunitKey' "$TMP/l.yaml" && fail "old key kept after rotation"
grep -qxF '  APIrotated: newSecret' "$TMP/l.yaml" || fail "rotated key missing"
# missing secret refuses
if LIVEKIT_API_KEY=x LIVEKIT_API_SECRET= bash "$HERE/render-livekit-keys.sh" "$TMP/l.yaml" 2>/dev/null; then fail "empty secret accepted"; fi
echo "PASS render-livekit-keys"
