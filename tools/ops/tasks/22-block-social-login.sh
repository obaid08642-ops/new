#!/bin/bash
# Q107 hotfix (until the Phase A deploy): production runs social-login code that signs a session for
# any email found in an unsigned token (Apple, X, Snapchat). Block POST /api/v1/auth/social-login at
# Nginx with 403. Effect: social sign-in (Google too) is off until the fixed backend is deployed;
# password and OTP login are untouched. Backup first; any failure restores it.
# Rollback: copy the backup back, nginx -t, reload (or REVERT=1 to remove the block).
# Rehearsed in .github/workflows/ops-rehearsal.yml (job social-login-block).
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
F=${OPS_NGINX_CONF:-$D/nginx/conf.d/nabd.plus.conf}
TS=$(date -u +%Y%m%dT%H%M%SZ)
BK=$B/$(basename "$F").pre-q107.$TS
NGX="sudo -n docker exec nabdah-nginx"
MARK='# Q107 hotfix: social-login off until the verified backend is deployed'
RULE="  location = /api/v1/auth/social-login { default_type application/json; return 403 '{\"statusCode\":403,\"message\":\"social_login_temporarily_disabled\"}'; } $MARK"
code() { curl -sk -o /dev/null -w '%{http_code}' --max-time 8 -H 'Host: api.nabd.plus' "$@"; }
liveness() { local c; for i in $(seq 1 6); do c=$(code https://127.0.0.1/api/v1/health/liveness); [ "$c" = 200 ] && return 0; sleep 3; done; echo "q107: api liveness=$c"; return 1; }
restore() { echo "q107: FAILED at '$1', restoring"; sudo -n sh -c "cat '$BK' > '$F'"; $NGX nginx -t >/dev/null 2>&1 && $NGX nginx -s reload >/dev/null 2>&1; sleep 2; liveness && echo "q107: restored, api 200" || echo "q107: RESTORE INCOMPLETE - needs attention"; exit 1; }
echo "## q107-block-social-login"

$NGX nginx -t >/dev/null 2>&1 || { echo "q107: ABORT nginx -t fails before starting"; exit 1; }
$NGX nginx -T 2>/dev/null | grep -q "$(basename "$F")" || { echo "q107: ABORT $(basename "$F") is not loaded by nginx"; exit 1; }
[ "$(grep -c 'server_name api.nabd.plus;' "$F")" = 1 ] || { echo "q107: ABORT expected exactly one 'server_name api.nabd.plus;' line"; exit 1; }
liveness || { echo "q107: ABORT api not 200 before starting"; exit 1; }
sudo -n mkdir -p "$B" && sudo -n cp -p "$F" "$BK" && echo "q107: backup $BK"

TMP=$(mktemp)
if [ "${REVERT:-0}" = 1 ]; then
  grep -vF "$MARK" "$F" > "$TMP"
else
  if grep -qF "$MARK" "$F"; then echo "q107: rule already present"; rm -f "$TMP"; exit 0; fi
  awk -v r="$RULE" '{print} /^[[:space:]]*server_name api\.nabd\.plus;[[:space:]]*$/ {print r}' "$F" > "$TMP"
fi
want=$([ "${REVERT:-0}" = 1 ] && echo 0 || echo 1)
lines=$(( $(wc -l < "$TMP") - $(wc -l < "$F") ))
[ "$(grep -cF "$MARK" "$TMP")" = "$want" ] && { [ "$lines" = 1 ] || [ "$lines" = -1 ]; } || { rm -f "$TMP"; echo "q107: ABORT rewrite check (rule=$(grep -cF "$MARK" "$TMP") lines=$lines)"; exit 1; }
sudo -n sh -c "cat '$TMP' > '$F'"; rm -f "$TMP"     # keeps the inode for the bind mount
[ "${REHEARSE_FAIL_AT:-}" = reload ] && restore "reload (forced, rehearsal)"
$NGX nginx -t >/dev/null 2>&1 || restore "nginx -t"
$NGX nginx -s reload >/dev/null 2>&1 || restore "nginx reload"
sleep 2
liveness || restore "api liveness"
c=$(code -X POST -H 'Content-Type: application/json' --data '{}' https://127.0.0.1/api/v1/auth/social-login)
if [ "${REVERT:-0}" = 1 ]; then
  [ "$c" != 403 ] || restore "social-login still 403 after revert"
  echo "q107: block removed, social-login reaches the backend ($c), api 200"
else
  [ "$c" = 403 ] || restore "social-login returned $c, expected 403"
  l=$(code -X POST -H 'Content-Type: application/json' --data '{}' https://127.0.0.1/api/v1/auth/login)
  [ "$l" != 403 ] || restore "password login blocked too ($l)"
  echo "q107: social-login 403 at nginx; password login still reaches the backend ($l); api 200"
fi
echo "## q107-block-social-login done"
