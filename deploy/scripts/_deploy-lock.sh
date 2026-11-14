#!/bin/bash
# Deploy lock: held while a deploy may restart Mongo or other services. oplog-backup.sh skips quietly while it exists
# (and is younger than NABD_DEPLOY_LOCK_MAX_MIN, so a crashed deploy cannot silence the backup for good).
# Sourced by deploy.sh and rolling-deploy.sh; when one calls the other the outer one keeps the lock.
NABD_DEPLOY_LOCK="${NABD_DEPLOY_LOCK:-/opt/nabdah/deploy.lock}"
if [ -z "${NABD_DEPLOY_LOCK_HELD:-}" ]; then
  if mkdir -p "$(dirname "$NABD_DEPLOY_LOCK")" 2>/dev/null && echo "$$ $(date -u +%FT%TZ)" > "$NABD_DEPLOY_LOCK" 2>/dev/null; then
    export NABD_DEPLOY_LOCK_HELD=1
    trap 'rm -f "$NABD_DEPLOY_LOCK"' EXIT
  else
    echo "warning: cannot write the deploy lock $NABD_DEPLOY_LOCK; the oplog backup may report a failed slice during this deploy" >&2
  fi
fi
