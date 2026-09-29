#!/bin/bash
# Render the committed coturn template into the file docker-compose mounts.
#
# The TURN static-auth-secret used to be committed in deploy/coturn/turnserver.conf.
# That secret mints TURN credentials: anyone holding it can relay through the
# server, so a copy in git is a live credential for the life of the secret. It now
# lives only in the environment and this script renders it into a git-ignored file.
#
# Run on the host before `docker compose up` (or from the deploy pipeline):
#   COTURN_STATIC_AUTH_SECRET=$(openssl rand -hex 32) ./deploy/scripts/render-coturn-config.sh
set -euo pipefail

TEMPLATE="${TEMPLATE:-deploy/coturn/turnserver.conf}"
OUTPUT="${OUTPUT:-deploy/coturn/turnserver.rendered.conf}"

if [ -z "${COTURN_STATIC_AUTH_SECRET:-}" ]; then
  echo "COTURN_STATIC_AUTH_SECRET is not set." >&2
  echo "Generate one with: openssl rand -hex 32" >&2
  echo "It must match the backend's COTURN_SECRET, or issued TURN credentials are rejected." >&2
  exit 1
fi

# Refuse an unrendered file: a container that still sees the ${...} placeholder
# would start with a broken or shared secret.
if grep -q '\${COTURN_STATIC_AUTH_SECRET' "$OUTPUT" 2>/dev/null; then
  echo "$OUTPUT still contains the placeholder; refusing to leave a half-rendered config" >&2
  exit 1
fi

tmp="${OUTPUT}.tmp.$$"
sed "s|\${COTURN_STATIC_AUTH_SECRET:?[^}]*}|${COTURN_STATIC_AUTH_SECRET}|g" "$TEMPLATE" > "$tmp"
mv "$tmp" "$OUTPUT"
chmod 600 "$OUTPUT"

echo "rendered $OUTPUT from $TEMPLATE (mode 600)"
