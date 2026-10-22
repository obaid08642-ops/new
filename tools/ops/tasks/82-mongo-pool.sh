#!/bin/bash
# Mongo connection pool (owner, 2026-10-22). Sets MONGO_MAX_POOL_SIZE=40 in .env.production (read by the backend and the
# worker), recreates both services, and prints the MongoDB connection counts before and after. A failed health check
# restores the env file and the services. Values are never printed (only the counts and the pool size).
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
ENVF=$D/.env.production
COMPOSE="$DK compose -f $D/docker-compose.production.yml --project-directory $D --env-file $ENVF"
echo "## mongo-pool"
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
wait_healthy() { local s; for i in $(seq 1 "$2"); do s=$(health "$1"); [ "$s" = healthy ] && return 0; sleep 5; done; echo "pool: $1 health=$s"; return 1; }
conns() { $DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "JSON.stringify(db.serverStatus().connections)"' 2>&1 | tail -1; }

echo "mongo: connections before: $(conns)"
sudo -n mkdir -p $B
sudo -n cp -p $ENVF $B/env.production.pre-pool.$TS && sudo -n chmod 600 $B/env.production.pre-pool.$TS
restore() {
  echo "pool: FAILED at '$1', restoring the env file and the services"
  sudo -n sh -c "cat $B/env.production.pre-pool.$TS > $ENVF"
  $COMPOSE up -d --no-deps --no-build --force-recreate backend worker >/dev/null 2>&1
  wait_healthy nabdah-backend 48 && echo "pool: rollback complete" || echo "pool: ROLLBACK INCOMPLETE - needs attention"
  exit 1
}
if sudo -n grep -q '^MONGO_MAX_POOL_SIZE=' $ENVF; then
  sudo -n sed -i 's/^MONGO_MAX_POOL_SIZE=.*/MONGO_MAX_POOL_SIZE=40/' $ENVF
else
  printf 'MONGO_MAX_POOL_SIZE=40\n' | sudo -n sh -c "cat >> $ENVF"
fi
sudo -n grep -qx 'MONGO_MAX_POOL_SIZE=40' $ENVF || restore "env value not written"
echo "pool: MONGO_MAX_POOL_SIZE set to 40 in .env.production"

$COMPOSE up -d --no-deps --no-build --force-recreate backend worker >/dev/null 2>&1 || restore "recreate backend and worker"
wait_healthy nabdah-backend 48 || restore "backend health"
[ "$(health nabdah-worker)" = running ] || restore "worker not running"
c=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness)
[ "$c" = 200 ] || restore "api liveness $c"
echo "pool: backend and worker recreated, healthy, api 200"

sleep 30
echo "mongo: connections after: $(conns)"
echo "## mongo-pool done"
