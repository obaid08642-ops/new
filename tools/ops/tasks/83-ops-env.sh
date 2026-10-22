#!/bin/bash
# READ-ONLY (owner, 2026-10-22). Presence of the server secrets, never their values. Prints status: lines only,
# as "status: env NAME present|missing" (no '=', so the public log's KEY=/SECRET= masking does not hide the result).
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
echo "## ops-env"
for k in AI_KEYS_ENC_KEY FIELD_ENCRYPTION_KEY BACKUP_ENCRYPTION_PASSPHRASE OWNER_ALERT_EMAIL; do
  if sudo -n grep -qE "^$k=.+" $ENVF 2>/dev/null; then v=present; else v=missing; fi
  echo "status: env $k $v"
done
for k in $(sudo -n grep -oE '^MAIL_[A-Z0-9_]+=' $ENVF 2>/dev/null | tr -d =); do
  sudo -n grep -qE "^$k=.+" $ENVF 2>/dev/null && echo "status: env $k present" || echo "status: env $k missing"
done
echo "## ops-env done"
