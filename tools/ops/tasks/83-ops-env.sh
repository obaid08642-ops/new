#!/bin/bash
# READ-ONLY (owner, 2026-10-22). Presence of the server settings, never their values. Prints status: lines only,
# as "status: env NAME present|missing" (no '=', so the public log's KEY=/SECRET= masking does not hide the result).
# The backup passphrase file is checked by path from .env.production: readable yes/no and its mode, never its content.
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
echo "## ops-env"
has() { sudo -n grep -qE "^$1=.+" $ENVF 2>/dev/null; }
val() { sudo -n grep -E "^$1=" $ENVF 2>/dev/null | head -1 | cut -d= -f2-; }
for k in AI_KEYS_ENC_KEY FIELD_ENCRYPTION_KEY BACKUP_ENCRYPTION_PASSPHRASE_FILE OPS_ALERT_EMAIL OWNER_ALERT_EMAIL; do
  if has $k; then echo "status: env $k present"; else echo "status: env $k missing"; fi
done
for k in $(sudo -n grep -oE '^MAIL_[A-Z0-9_]+=' $ENVF 2>/dev/null | tr -d =); do
  if has $k; then echo "status: env $k present"; else echo "status: env $k missing"; fi
done
# backup passphrase file: the path comes from the env file and is not printed
pf=$(val BACKUP_ENCRYPTION_PASSPHRASE_FILE)
rd=no; md=n/a
if [ -n "$pf" ] && sudo -n test -e "$pf" 2>/dev/null; then
  sudo -n test -r "$pf" && rd=yes
  md=$(sudo -n stat -c %a "$pf" 2>/dev/null || echo n/a)
fi
echo "status: backup passfile_readable=$rd mode=$md"
rq=$(val BACKUP_REQUIRE_ENCRYPTION)
case "$rq" in 0|1) ;; *) rq=unset;; esac
echo "status: backup require_encryption=$rq"
echo "## ops-env done"
