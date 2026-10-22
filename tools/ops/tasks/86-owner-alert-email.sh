#!/bin/bash
# OWNER_ALERT_EMAIL (owner, 2026-10-22): when it is missing from .env.production, it gets the value OPS_ALERT_EMAIL
# already has ON THE SERVER (the value never leaves the host and is never printed). Backend and worker are then recreated
# with the release compose file (as 82) and checked; any failure restores the env file. Output: status: lines only.
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
ENVF=$D/.env.production
COMPOSE="$DK compose -f $D/docker-compose.production.yml -f $D/docker-compose.release.yml --project-directory $D --env-file $ENVF"
[ -f $D/docker-compose.release.yml ] || COMPOSE="$DK compose -f $D/docker-compose.production.yml --project-directory $D --env-file $ENVF"
TOUCHED=0
echo "## owner-alert-email"
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
wait_ok() { local s; for i in $(seq 1 "$2"); do s=$(health "$1"); case "$s" in healthy|running) [ "$s" = healthy ] || [ "$1" = nabdah-worker ] && return 0;; esac; sleep 5; done; return 1; }

if sudo -n grep -qE '^OWNER_ALERT_EMAIL=.+' $ENVF; then echo "status: env OWNER_ALERT_EMAIL present"; exit 0; fi
sudo -n grep -qE '^OPS_ALERT_EMAIL=.+@.+' $ENVF || { echo "status: env OWNER_ALERT_EMAIL failed_at=no_ops_alert_email"; exit 1; }

sudo -n mkdir -p $B
sudo -n cp -p $ENVF $B/env.production.pre-owner-alert.$TS && sudo -n chmod 600 $B/env.production.pre-owner-alert.$TS || { echo "status: env OWNER_ALERT_EMAIL failed_at=backup"; exit 1; }
restore() {
  echo "status: env OWNER_ALERT_EMAIL failed_at=$1"
  sudo -n sh -c "cat $B/env.production.pre-owner-alert.$TS > $ENVF"
  [ "$TOUCHED" = 1 ] && $COMPOSE up -d --no-deps --no-build --force-recreate backend worker >/dev/null 2>&1
  if wait_ok nabdah-backend 48 && wait_ok nabdah-worker 48; then echo "status: env OWNER_ALERT_EMAIL rollback=complete"; else echo "status: env OWNER_ALERT_EMAIL rollback=incomplete"; fi
  exit 1
}
SVC=$($COMPOSE config --services 2>/dev/null)
echo "$SVC" | grep -qx backend && echo "$SVC" | grep -qx worker || restore compose_services

# the copy happens inside one root shell: the value is read and written there, never on a command line or in the log
sudo -n sh -c "umask 077; v=\$(grep -E '^OPS_ALERT_EMAIL=' $ENVF | head -1 | cut -d= -f2-); grep -v '^OWNER_ALERT_EMAIL=' $ENVF > $ENVF.tmp.$TS && printf 'OWNER_ALERT_EMAIL=%s\n' \"\$v\" >> $ENVF.tmp.$TS && cat $ENVF.tmp.$TS > $ENVF; rm -f $ENVF.tmp.$TS" || restore env_write
sudo -n grep -qE '^OWNER_ALERT_EMAIL=.+@.+' $ENVF || restore env_check
[ "$(sudo -n grep -c '' $ENVF)" -ge "$(sudo -n grep -c '' $B/env.production.pre-owner-alert.$TS)" ] || restore env_lines

TOUCHED=1
$COMPOSE up -d --no-deps --no-build --force-recreate backend worker >/dev/null 2>&1 || restore recreate
wait_ok nabdah-backend 48 || restore backend_health
wait_ok nabdah-worker 48 || restore worker_state
c=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 -H 'Host: api.nabd.plus' https://127.0.0.1/api/v1/health/liveness)
[ "$c" = 200 ] || restore api_liveness
echo "status: env OWNER_ALERT_EMAIL added"
echo "status: owner alert health=ok"
