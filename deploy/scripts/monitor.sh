#!/bin/bash
# ═══ Nabdah Plus — production monitoring & alerting (every 15min via cron) ═══
cd "$(dirname "$0")/.." 2>/dev/null || true
set -a; [ -f .env.production ] && source .env.production 2>/dev/null; set +a
TS=$(date '+%Y-%m-%d %H:%M:%S')
ALERTS=()
alert() { ALERTS+=("$1"); echo "[$TS] ALERT: $1" >> /var/log/nabdah-alerts.log; }

for c in nabdah-mongodb nabdah-redis nabdah-backend nabdah-fastapi nabdah-admin-web nabdah-livekit nabdah-coturn nabdah-nginx; do
  st=$(docker inspect -f '{{.State.Status}} {{.State.Health.Status}}' "$c" 2>/dev/null || echo "missing")
  case "$st" in
    *running*) ;;
    *) alert "container $c state=$st" ;;
  esac
done

docker exec nabdah-mongodb mongosh --quiet -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --eval 'db.runCommand({ping:1})' >/dev/null 2>&1 || alert "mongodb ping failed"
docker exec nabdah-redis redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG || alert "redis ping failed"
docker exec nabdah-backend wget -qO- http://127.0.0.1:8002/api/v1/health/liveness >/dev/null 2>&1 || alert "backend liveness failed"

DISK=$(df / | awk 'NR==2{gsub("%","",$5); print $5}')
[ "${DISK:-0}" -gt 85 ] && alert "disk usage ${DISK}% > 85%"
RAM=$(free | awk '/Mem:/{printf "%.0f", $3/$2*100}')
[ "${RAM:-0}" -gt 90 ] && alert "ram usage ${RAM}% > 90%"
LOAD=$(cat /proc/loadavg | awk '{print $1}')
HIGH=$(awk -v l="$LOAD" 'BEGIN{print (l>4)?1:0}')
[ "$HIGH" = "1" ] && alert "cpu load ${LOAD} > 4"

for pem in certs/live/*/fullchain.pem; do
  [ -f "$pem" ] || continue
  DAYS=$(( ( $(date -d "$(openssl x509 -enddate -noout -in "$pem" | cut -d= -f2)" +%s) - $(date +%s) ) / 86400 ))
  [ "$DAYS" -lt 14 ] && alert "ssl cert $(basename $(dirname $pem)) expires in ${DAYS}d"
done

LAST=$(ls -t /opt/nabdah/backups/nabd_*.gz 2>/dev/null | head -1)
if [ -z "$LAST" ]; then
  alert "no backups found"
else
  AGE=$(( ( $(date +%s) - $(stat -c %Y "$LAST") ) / 3600 ))
  [ "$AGE" -gt 26 ] && alert "last backup is ${AGE}h old"
fi

if [ ${#ALERTS[@]} -eq 0 ]; then
  echo "[$TS] OK — all checks passed (disk ${DISK:-?}%, ram ${RAM:-?}%, load ${LOAD:-?})" >> /var/log/nabdah-monitor.log
else
  MSG=$(printf '%s; ' "${ALERTS[@]}")
  echo "[$TS] ${#ALERTS[@]} alerts: $MSG" >> /var/log/nabdah-monitor.log
fi
