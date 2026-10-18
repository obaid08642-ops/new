#!/bin/bash
# ═══ Zero-downtime rolling deploy of one or more services (20.9) ═══
# Usage: rolling-deploy.sh backend [patient-web] [admin-web] [worker]
# The compose files already point at the NEW image (release overlay or a fresh build). For each web-facing service:
#   1. B: start a second container of the new image on the same networks, WITHOUT the service's DNS alias, so it
#      receives no traffic while it boots. The old container A keeps serving; nothing has changed for users yet.
#   2. Wait until B is healthy and answers its smoke request. If not: B is removed, A is untouched, exit 1
#      (this IS the automatic rollback: the old version never stopped, and B never took a request).
#   3. Give B the service alias (docker network connect --alias), wait for nginx to learn it (the upstreams use `resolve`, valid=10s), then stop A (SIGTERM; the backend keeps
#      serving with Connection: close for SHUTDOWN_DRAIN_MS first; docker stop -t waits for it) and remove it.
#   4. C: bring up the compose-managed container (nabdah-<service>) on the new image beside B, wait healthy and smoke it.
#      If C fails, B keeps serving the new version and the script exits 2 (needs attention, nothing is down).
#   5. Wait for nginx again, then retire B the same way.
# `worker` has no inbound traffic: stop (60 s for running jobs), then start the new one (queue jobs wait meanwhile).
# At most two containers of a service run at once: RAM is checked first (ROLL_MIN_FREE_MB, default 600).
# Environment: DEPLOY_DIR (/opt/nabdah/deploy), COMPOSE_FILES (default: docker-compose.production.yml plus
# docker-compose.release.yml when present), ENV_FILE, NGINX_WAIT (13 s), HEALTH_TIMEOUT (180 s), DRAIN_TIMEOUT (40 s),
# SMOKE_PATH (/api/v1/health/liveness for backend, / for the web apps), SMOKE_PORT, DOCKER ("docker" or "sudo -n docker").
# Websocket (Socket.IO) connections of the retired backend drop and the clients reconnect on their own; every HTTP
# request is served by a healthy container at every moment (proved under load in .github/workflows/zero-downtime.yml).
set -uo pipefail
D=${DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=${ENV_FILE:-$D/.env.production}
DK=${DOCKER:-docker}
NGINX_WAIT=${NGINX_WAIT:-13}
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-180}
DRAIN_TIMEOUT=${DRAIN_TIMEOUT:-40}
MIN_FREE=${ROLL_MIN_FREE_MB:-600}
if [ -z "${COMPOSE_FILES:-}" ]; then
  COMPOSE_FILES="$D/docker-compose.production.yml"
  [ -f "$D/docker-compose.release.yml" ] && COMPOSE_FILES="$COMPOSE_FILES $D/docker-compose.release.yml"
fi
CARGS=(--project-directory "$D")
for f in $COMPOSE_FILES; do CARGS+=(-f "$f"); done
[ -f "$ENVF" ] && CARGS+=(--env-file "$ENVF")
compose() { $DK compose "${CARGS[@]}" "$@"; }
log() { echo "[rolling $(date -u +%H:%M:%S)] $*"; }

health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
wait_healthy() { # name seconds
  local s="" end=$((SECONDS + $2))
  while [ $SECONDS -lt $end ]; do
    s=$(health "$1"); [ "$s" = healthy ] && return 0
    [ "$s" = exited ] || [ "$s" = dead ] && break
    sleep 2
  done
  log "$1 health=$s"; return 1
}
smoke() { # container port path
  $DK exec "$1" node -e "fetch('http://127.0.0.1:$2$3').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1
}
retire() { # container: stop with drain, remove
  log "retiring $1 (drain up to ${DRAIN_TIMEOUT}s)"
  $DK stop -t "$DRAIN_TIMEOUT" "$1" >/dev/null 2>&1
  $DK rm -f "$1" >/dev/null 2>&1
}
free_mb() { awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 99999; }

roll_worker() {
  local A=nabdah-worker
  log "worker: stop old (60 s for running jobs), start new"
  $DK stop -t 60 "$A" >/dev/null 2>&1
  compose up -d --no-deps --force-recreate worker >/dev/null 2>&1 || { log "worker: up failed"; return 2; }
  wait_healthy "$A" "$HEALTH_TIMEOUT" || return 2
  log "worker: running on the new image"
}

roll_web() {
  local svc=$1 A="nabdah-$1" B="nabdah-$1-roll" port path
  case $svc in backend) port=${SMOKE_PORT:-8002}; path=${SMOKE_PATH:-/api/v1/health/liveness};; *) port=${SMOKE_PORT:-3000}; path=${SMOKE_PATH:-/};; esac
  [ "$(health "$A")" = healthy ] || { log "$svc: $A is not healthy, nothing to roll (use docker compose up -d for a first start)"; return 1; }
  [ "$(free_mb)" -ge "$MIN_FREE" ] || { log "$svc: only $(free_mb) MB free, two containers do not fit (need $MIN_FREE); old version untouched"; return 1; }
  $DK rm -f "$B" >/dev/null 2>&1
  log "$svc: starting the new version as $B beside $A"
  compose run -d --no-deps --name "$B" "$svc" >/dev/null 2>&1 || { log "$svc: could not start $B; old version untouched"; $DK rm -f "$B" >/dev/null 2>&1; return 1; }
  if ! wait_healthy "$B" "$HEALTH_TIMEOUT" || ! smoke "$B" "$port" "$path"; then
    log "$svc: the new version is not healthy; last log lines:"; $DK logs --tail 15 "$B" 2>&1 | cut -c1-200 | sed 's/^/    /'
    $DK rm -f "$B" >/dev/null 2>&1
    log "$svc: ROLLED BACK (the old version never stopped)"; return 1
  fi
  log "$svc: $B healthy and answering; giving it the alias '$svc'"
  local net
  for net in $($DK inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$B"); do
    $DK network disconnect "$net" "$B" >/dev/null 2>&1
    $DK network connect --alias "$svc" "$net" "$B" >/dev/null 2>&1 || { log "$svc: cannot attach the alias on $net; old version untouched"; $DK rm -f "$B" >/dev/null 2>&1; return 1; }
  done
  log "$svc: waiting ${NGINX_WAIT}s for nginx to learn $B"
  sleep "$NGINX_WAIT"
  retire "$A"
  log "$svc: starting the compose-managed container beside $B"
  compose up -d --no-deps "$svc" >/dev/null 2>&1
  if ! wait_healthy "$A" "$HEALTH_TIMEOUT" || ! smoke "$A" "$port" "$path"; then
    log "$svc: NEEDS ATTENTION: $A did not come up; $B keeps serving the new version, nothing is down"; return 2
  fi
  sleep "$NGINX_WAIT"
  retire "$B"
  log "$svc: done, $A runs the new image"
}

rc=0
for svc in "$@"; do
  case $svc in
    backend|patient-web|admin-web) roll_web "$svc" ;;
    worker) roll_worker ;;
    *) log "unsupported service: $svc"; rc=2; continue ;;
  esac
  r=$?
  if [ $r -ne 0 ]; then rc=$r; log "stopping after $svc (exit $r); services after it were not touched"; break; fi
done
exit $rc
