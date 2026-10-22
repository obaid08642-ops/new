#!/bin/bash
# Mongo connection pool (owner, 2026-10-22). Sets MONGO_MAX_POOL_SIZE=40 in .env.production (read by the backend and the
# worker), recreates both services, and prints the MongoDB connection counts before and after as status: lines.
# Compose files: production.yml + release.yml when release.yml exists (as in 68-mongo-start.sh and 60-deploy-main.sh);
# without the release file `up --no-build` cannot recreate the release images (run 39771328834 failed at once for that reason).
# A failure restores the env file and, only if the services were touched, recreates them; the step name and the rollback
# result are printed as status: lines (names only, no values). Secret values are never printed.
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
ENVF=$D/.env.production
COMPOSE="$DK compose -f $D/docker-compose.production.yml -f $D/docker-compose.release.yml --project-directory $D --env-file $ENVF"
FILES=2
if [ ! -f $D/docker-compose.release.yml ]; then
  COMPOSE="$DK compose -f $D/docker-compose.production.yml --project-directory $D --env-file $ENVF"
  FILES=1
fi
TOUCHED=0
echo "## mongo-pool"
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
wait_healthy() { local s; for i in $(seq 1 "$2"); do s=$(health "$1"); [ "$s" = healthy ] && return 0; sleep 5; done; echo "pool: $1 health=$s"; return 1; }
conns() { $DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "JSON.stringify(db.serverStatus().connections)"' 2>&1 | tail -1; }
# prints one status: line with the counts only (phase = before | after)
status_conns() { local j c a; j=$(conns); c=$(echo "$j" | grep -oE '"current":[0-9]+' | grep -oE '[0-9]+'); a=$(echo "$j" | grep -oE '"available":[0-9]+' | grep -oE '[0-9]+'); echo "status: mongo connections current=${c:-n/a} available=${a:-n/a} phase=$1"; }

status_conns before
sudo -n mkdir -p $B
sudo -n cp -p $ENVF $B/env.production.pre-pool.$TS && sudo -n chmod 600 $B/env.production.pre-pool.$TS
restore() {
  # $1 = step name (a word, no values). Env file back; services recreated only if they were touched.
  echo "pool: FAILED at '$1', restoring"
  echo "status: mongo pool failed_at=$1"
  echo "status: mongo pool health=fail"
  sudo -n sh -c "cat $B/env.production.pre-pool.$TS > $ENVF"
  if [ "$TOUCHED" = 1 ]; then
    $COMPOSE up -d --no-deps --no-build --force-recreate backend worker >/dev/null 2>&1
  fi
  if wait_healthy nabdah-backend 48 && [ "$(health nabdah-worker)" = running ]; then
    echo "status: mongo pool rollback=complete"
  else
    echo "status: mongo pool rollback=incomplete"
  fi
  exit 1
}

# preflight (read only): the compose project must list backend and worker
echo "status: mongo pool compose_files=$FILES"
SVC=$($COMPOSE config --services 2>/dev/null)
echo "$SVC" | grep -qx backend && echo "$SVC" | grep -qx worker || restore "compose_services"

# new env file built beside the old one, checked, then written with sh -c (as 35-livekit-rotate does)
TE=$(mktemp)
sudo -n cat $ENVF > $TE || { rm -f $TE; restore "env_read"; }
if grep -q '^MONGO_MAX_POOL_SIZE=' $TE; then
  sed -i 's/^MONGO_MAX_POOL_SIZE=.*/MONGO_MAX_POOL_SIZE=40/' $TE
else
  printf 'MONGO_MAX_POOL_SIZE=40\n' >> $TE
fi
[ "$(grep -c '^MONGO_MAX_POOL_SIZE=40$' $TE)" = 1 ] && [ "$(wc -l < $TE)" -ge "$(sudo -n cat $ENVF | wc -l)" ] || { rm -f $TE; restore "env_build"; }
sudo -n sh -c "cat $TE > $ENVF"; rm -f $TE
sudo -n grep -qx 'MONGO_MAX_POOL_SIZE=40' $ENVF || restore "env_write"
echo "pool: MONGO_MAX_POOL_SIZE set to 40 in .env.production"

TOUCHED=1
$COMPOSE up -d --no-deps --no-build --force-recreate backend worker >/dev/null 2>&1 || restore "recreate"
wait_healthy nabdah-backend 48 || restore "backend_health"
[ "$(health nabdah-worker)" = running ] || restore "worker_state"
c=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness)
[ "$c" = 200 ] || restore "api_liveness"
echo "pool: backend and worker recreated, healthy, api 200"
echo "status: mongo pool health=ok"

sleep 30
status_conns after
echo "## mongo-pool done"
