#!/bin/bash
# Owner-delegated cleanup (2026-10-04). Frees RAM without touching production data:
#  1. staging.nabd.plus: its backend runs on the production server (unhealthy, ~340 MB RAM).
#     Disable its nginx site first (nginx refuses to reload if an upstream host is missing),
#     then STOP the container (not removed: `docker start nabdah-staging-backend` + renaming
#     staging.conf back restores it).
#  2. Remove dangling (untagged, unused) Docker images only.
#  3. Delete the three August "pre-*" snapshot backups; the daily backups (14-day retention) stay.
set -u
D=/opt/nabdah/deploy
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
NGX="$DK exec nabdah-nginx"
echo "## free-memory"
echo "cleanup: RAM before: $(free -m | awk '/Mem:/{print "used="$3"MB free="$4"MB avail="$7"MB"}') $(free -m | awk '/Swap:/{print "swap_used="$3"MB"}')"

if [ -f $D/nginx/conf.d/staging.conf ]; then
  sudo -n mv $D/nginx/conf.d/staging.conf $D/nginx/conf.d/staging.conf.disabled-$TS
  if $NGX nginx -t >/dev/null 2>&1; then $NGX nginx -s reload; echo "cleanup: staging.nabd.plus nginx site disabled"
  else sudo -n mv $D/nginx/conf.d/staging.conf.disabled-$TS $D/nginx/conf.d/staging.conf; echo "cleanup: nginx -t failed, staging site left as is"; fi
fi
if [ ! -f $D/nginx/conf.d/staging.conf ] && $DK ps --format '{{.Names}}' | grep -qx nabdah-staging-backend; then
  $DK stop nabdah-staging-backend >/dev/null && echo "cleanup: nabdah-staging-backend stopped (kept, can be started again)"
fi
sleep 3
$NGX nginx -t >/dev/null 2>&1 && echo "cleanup: nginx config still valid" || echo "cleanup: WARNING nginx -t fails"

before=$($DK system df --format '{{.Type}} {{.Size}}' | awk '/Images/{print $2}')
$DK image prune -f >/dev/null 2>&1
echo "cleanup: dangling images pruned (images size before=$before after=$($DK system df --format '{{.Type}} {{.Size}}' | awk '/Images/{print $2}'))"

n=0; for f in /opt/nabdah/backups/pre-*.gz; do [ -f "$f" ] || continue; sudo -n rm -f "$f" && n=$((n+1)); done
echo "cleanup: removed $n August pre-* snapshot backups; daily backups kept: $(ls /opt/nabdah/backups/nabd_*.gz 2>/dev/null | wc -l)"
echo "cleanup: disk / now $(df -h / | awk 'NR==2{print $3" used, "$4" free"}')"
sleep 5
echo "cleanup: RAM after: $(free -m | awk '/Mem:/{print "used="$3"MB free="$4"MB avail="$7"MB"}') $(free -m | awk '/Swap:/{print "swap_used="$3"MB"}')"
$DK ps --format '{{.Names}}\t{{.Status}}'
echo "## free-memory done"
