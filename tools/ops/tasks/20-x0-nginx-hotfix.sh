#!/bin/bash
# X0 hotfix (owner-delegated 2026-10-04): stop Nginx caching API responses, which served one
# user's private data to others. Replaces every `proxy_cache api_cache;` in the live API config
# with `proxy_cache off;`, validates, reloads (no downtime) and empties the cache directory.
# Backup first; any failure restores the backup. Rollback: copy the backup back and reload.
set -u
F=/opt/nabdah/deploy/nginx/conf.d/nabd.plus.conf
TS=$(date -u +%Y%m%dT%H%M%SZ)
BK=/opt/nabdah/backups/nabd.plus.conf.pre-x0.$TS
NGX="sudo -n docker exec nabdah-nginx"
count() { $NGX nginx -T 2>/dev/null | grep -cE '^\s*proxy_cache\s+api_cache;'; }

echo "## x0-hotfix"
$NGX nginx -T 2>/dev/null | grep -q "conf.d/nabd.plus.conf" || { echo "x0: ABORT nabd.plus.conf is not loaded by nginx"; exit 1; }
before=$(count); echo "x0: active 'proxy_cache api_cache' before=$before"
[ "$before" = 0 ] && { echo "x0: nothing to do"; exit 0; }
sudo -n cp -p "$F" "$BK" && echo "x0: backup $BK"
# rewrite in place (keeps the inode, so a single-file bind mount sees the change)
TMP=$(mktemp); sed -E 's/^(\s*)proxy_cache\s+api_cache;/\1proxy_cache off; # X0 hotfix: never cache private API responses/' "$F" > "$TMP"
sudo -n sh -c "cat '$TMP' > '$F'"; rm -f "$TMP"
if ! $NGX nginx -t 2>&1 | tail -2; then
  echo "x0: nginx -t FAILED, restoring"; sudo -n sh -c "cat '$BK' > '$F'"; $NGX nginx -t >/dev/null 2>&1; exit 1
fi
$NGX nginx -s reload && sleep 2
after=$(count); echo "x0: active 'proxy_cache api_cache' after=$after"
if [ "$after" != 0 ]; then echo "x0: change not visible inside the container, restoring"; sudo -n sh -c "cat '$BK' > '$F'"; $NGX nginx -s reload; exit 1; fi
$NGX sh -c 'rm -rf /var/cache/nginx/api/* 2>/dev/null; echo "x0: cache dir emptied ($(ls /var/cache/nginx/api 2>/dev/null | wc -l) entries left)"'
code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health)
echo "x0: api health after reload: $code"
echo "## x0-hotfix done"
