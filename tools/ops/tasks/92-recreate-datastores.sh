#!/bin/bash
# Recreate the datastores so the memory budget (#2137) applies to them: the deploy task (60-deploy-main.sh) recreates only meilisearch, backend, worker,
# the two web apps and nginx, so mongodb, redis, livekit and coturn still run without their compose limits / oom_score_adj, and mongod has not re-read
# mongod.conf. Two runs of the same task. RUN AT A QUIET HOUR, after the owner's approval: MongoDB is unavailable for the duration of the recreate.
#   Run 1 (APPLY empty): DRY RUN. Prints, as `status:` lines, per container its limit now against the limit in the compose file, restarts, MemAvailable, whether
#                        mongod is PRIMARY, the number of active calls and what the apply would do. Nothing is written, nothing is stopped.
#   Run 2 (APPLY=yes, set in this file by the reviewer): APPLY. Order:
#     0. pre-checks: redis, mongodb, backend (and worker) healthy; the compose file valid; MemAvailable printed; the deploy lock free
#     1. a fresh mongodump (same command as the deploy task), size checked against the last nightly, gzip tested; copies of the compose files in $B
#     2. redis: `up -d --no-deps --force-recreate redis`, healthy, memory limit set, maxmemory is the one in redis.conf
#     3. mongodb: the same; healthy and PRIMARY (db.hello().isWritablePrimary), then the API readiness is 200 again and backend/worker are healthy. The seconds from the
#        start of the recreate to "PRIMARY and API ready" are printed as mongodb_downtime_seconds. The backend is NOT restarted: its driver reconnects by itself
#     4. livekit and coturn: only when no call is active (callsessions with status ACTIVE updated in the last CALL_WINDOW_MIN minutes, the backend's own rule); otherwise a
#        status line says they were skipped and the task can be run again later
#     5. memory-report.sh is printed after
#     6. any failure in 2-4: the failed service is recreated again WITHOUT limits (a generated override: mem_limit/mem_reservation/memswap_limit/oom_score_adj 0, i.e. how it ran
#        before), waits for healthy, and the task exits 1. The data volumes are never touched.
# Secret values are never printed or passed as arguments (the containers' own environment is used for the database credentials).
set -u
APPLY="yes"
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
ENVF=$D/.env.production
CALL_WINDOW_MIN=${CALL_WINDOW_MIN:-180}
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
H_API='Host: api.nabd.plus'
FILES="-f $D/docker-compose.production.yml"
[ -f "$D/docker-compose.release.yml" ] && FILES="$FILES -f $D/docker-compose.release.yml"
COMPOSE="$DK compose $FILES --project-directory $D --env-file $ENVF"
OVERRIDE=""
echo "## recreate-datastores"

say() { echo "status: recreate-datastores: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
wait_healthy() { local s; for i in $(seq 1 "${OPS_WAIT_TRIES:-60}"); do s=$(health "$1"); [ "$s" = healthy ] && return 0; sleep "${OPS_WAIT_SLEEP:-5}"; done; say "$1 health=$s"; return 1; }
code() { curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H "$H_API" "https://127.0.0.1$1"; }
wait_code() { local c; for i in $(seq 1 "${OPS_WAIT_TRIES:-60}"); do c=$(code "$1"); [ "$c" = "$2" ] && return 0; sleep "${OPS_WAIT_SLEEP:-5}"; done; say "$1 answered $c, wanted $2"; return 1; }
limit_mb() { local b; b=$($DK inspect -f '{{.HostConfig.Memory}}' "$1" 2>/dev/null); [ "${b:-0}" -gt 0 ] 2>/dev/null && echo "$((b / 1048576))MB" || echo none; }
wanted_mb() { $COMPOSE config 2>/dev/null | awk -v s="$1" '$0 ~ "^  "s":$" {f=1; next} f && /^  [a-z]/ {f=0} f && /mem_limit:/ {print $2; exit}' ; }
mem_available_mb() { awk '/^MemAvailable:/ {print int($2/1024)}' "${OPS_MEMINFO:-/proc/meminfo}" 2>/dev/null; }
# mongod's own credentials are in the container's environment: nothing secret passes through this script
mongo_eval() { $DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null | tail -1 | tr -d '\r'; }
is_primary() { [ "$(mongo_eval 'db.hello().isWritablePrimary')" = true ]; }
active_calls() { mongo_eval "db.getSiblingDB(process.env.DB_NAME || 'nabd_nestjs').callsessions.countDocuments({status:'ACTIVE', updatedAt:{\$gte:new Date(Date.now()-${CALL_WINDOW_MIN}*60000)}})"; }
redis_password() { sudo -n sed -n 's/^REDIS_PASSWORD=//p' "$ENVF" 2>/dev/null | tail -1 | tr -d "\"'"; }
redis_maxmemory() { redis_password | $DK exec -i nabdah-redis sh -c 'read -r REDISCLI_AUTH; export REDISCLI_AUTH; redis-cli config get maxmemory | tail -1' 2>/dev/null | tr -d '\r'; }
conf_maxmemory_bytes() {
  local v; v=$(sudo -n awk '$1=="maxmemory"{v=$2} END{print v}' "$D/redis/redis.conf" 2>/dev/null); v=${v,,}
  case "$v" in *gb) echo $(( ${v%gb} * 1073741824 ));; *mb) echo $(( ${v%mb} * 1048576 ));; *kb) echo $(( ${v%kb} * 1024 ));; *) echo "$v";; esac
}

# --- 0. pre-checks
for c in nabdah-redis nabdah-mongodb nabdah-backend; do [ "$(health $c)" = healthy ] || { say "ABORT $c is not healthy ($(health $c))"; exit 1; }; done
WORKER=""; $DK inspect nabdah-worker >/dev/null 2>&1 && WORKER=nabdah-worker && { [ "$(health nabdah-worker)" = healthy ] || { say "ABORT nabdah-worker is not healthy"; exit 1; }; }
$COMPOSE config -q >/dev/null 2>&1 || { say "ABORT the compose files do not validate"; exit 1; }
sudo -n test -r "$ENVF" || { say "ABORT $ENVF is not readable"; exit 1; }
LOCK=${NABD_DEPLOY_LOCK:-/opt/nabdah/deploy.lock}
if sudo -n test -e "$LOCK" 2>/dev/null; then say "ABORT the deploy lock exists ($LOCK): a deploy may be running"; exit 1; fi
say "MemAvailable=$(mem_available_mb)MB before"
for s in mongodb redis livekit coturn; do
  say "$s: limit now=$(limit_mb nabdah-$s), compose says=$(wanted_mb $s || true), restarts=$($DK inspect -f '{{.RestartCount}}' nabdah-$s 2>/dev/null), oom_score_adj=$($DK inspect -f '{{.HostConfig.OomScoreAdj}}' nabdah-$s 2>/dev/null)"
done
is_primary && say "mongod: PRIMARY" || { say "ABORT mongod is not PRIMARY"; exit 1; }
CALLS=$(active_calls); say "active calls (window ${CALL_WINDOW_MIN} min): ${CALLS:-unknown}"
say "meilisearch: restarts=$($DK inspect -f '{{.RestartCount}}' nabdah-meilisearch 2>/dev/null) started=$($DK inspect -f '{{.State.StartedAt}}' nabdah-meilisearch 2>/dev/null) use=$($DK stats --no-stream --format '{{.MemUsage}}' nabdah-meilisearch 2>/dev/null | awk -F' / ' '{print $1}')"
if [ "$APPLY" != yes ]; then
  say "dry run only: nothing was written or stopped. APPLY would: take a mongodump, recreate redis, then mongodb (MongoDB unavailable for the recreate, expect about a minute), livekit/coturn only when no call is active"
  exit 0
fi

# --- 1. backup (the deploy task's own steps: mongodump inside nabdah-mongodb, docker cp to $B, size and gzip checks), with the result of EVERY step printed
errclass() { printf '%s' "${1:-}" | tr -c 'A-Za-z0-9_\n-' ' ' | awk 'NF {print substr($1, 1, 24); f=1; exit} END {if (!f) print "none"}'; }
sudo -n mkdir -p "$B"
DUMP=$B/pre-recreate-$TS.gz
# room first: a full dump is a few hundred MB on the host disk (and in the container's /tmp on the same disk)
FREE_MB=$(df -Pm "$B" 2>/dev/null | awk 'NR==2 {print $4}')
TMP_FREE_MB=$($DK exec nabdah-mongodb df -Pm /tmp 2>/dev/null | awk 'NR==2 {print $4}')
say "backup room: host_free_mb=${FREE_MB:-?} container_tmp_free_mb=${TMP_FREE_MB:-?} MemAvailable=$(mem_available_mb)MB"
[ "${FREE_MB:-0}" -ge "${MIN_FREE_MB:-2048}" ] 2>/dev/null || { say "ABORT only ${FREE_MB:-?} MB free where the backup goes (need ${MIN_FREE_MB:-2048}): nothing was stopped"; exit 1; }
DUMP_ERR=$($DK exec nabdah-mongodb sh -c 'mongodump --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --gzip --archive=/tmp/pre-recreate.gz' 2>&1 >/dev/null); DUMP_RC=$?
CP_RC=skipped; CP_ERR=""
if [ $DUMP_RC -eq 0 ]; then CP_ERR=$($DK cp nabdah-mongodb:/tmp/pre-recreate.gz "$DUMP" 2>&1 >/dev/null); CP_RC=$?; fi
$DK exec nabdah-mongodb rm -f /tmp/pre-recreate.gz >/dev/null 2>&1
sudo -n chmod 600 "$DUMP" 2>/dev/null
SZ=$(sudo -n stat -c %s "$DUMP" 2>/dev/null); STAT_RC=$?
SZ=${SZ:-0}
LAST=$(sudo -n sh -c "ls -t $B/nabd_*.gz 2>/dev/null | head -1")
LASTSZ=$([ -n "$LAST" ] && sudo -n stat -c %s "$LAST" || echo 0)
say "backup steps: mongodump rc=$DUMP_RC err=$(errclass "$DUMP_ERR") ; docker cp rc=$CP_RC err=$(errclass "$CP_ERR") ; stat rc=$STAT_RC size_bytes=$SZ ; last nightly $LASTSZ"
[ "$SZ" -gt 1048576 ] && [ "$SZ" -ge $((LASTSZ / 2)) ] || { say "ABORT backup too small ($SZ bytes; last nightly $LASTSZ; see the steps above): nothing was stopped"; exit 1; }
sudo -n gzip -t "$DUMP" 2>/dev/null || { say "ABORT backup is not a valid gzip: nothing was stopped"; exit 1; }
say "backup ok ($(basename "$DUMP"), $((SZ / 1048576)) MB; last nightly $((LASTSZ / 1048576)) MB)"
for f in docker-compose.production.yml docker-compose.release.yml; do sudo -n test -f "$D/$f" && sudo -n cp -p "$D/$f" "$B/recreate-$TS-$f"; done
say "compose files copied to $B (recreate-$TS-*)"

# --- the way back: the same service without limits (how it ran before the memory budget)
rollback_service() {
  local s=$1
  OVERRIDE=$(sudo -n mktemp) && printf 'services:\n  %s:\n    mem_limit: 0\n    mem_reservation: 0\n    memswap_limit: 0\n    oom_score_adj: 0\n' "$s" | sudo -n tee "$OVERRIDE" >/dev/null || return 1
  $DK compose $FILES -f "$OVERRIDE" --project-directory "$D" --env-file "$ENVF" up -d --no-deps --force-recreate "$s" >/dev/null 2>&1
  local rc=$?; sudo -n rm -f "$OVERRIDE"; OVERRIDE=""
  [ $rc -eq 0 ] && wait_healthy "nabdah-$s"
}
fail() { # $1 = service being recreated, $2 = what failed
  say "FAILED at '$2' on $1: putting the service back without limits (data untouched)"
  if rollback_service "$1"; then say "rollback complete: $1 is healthy again, without the memory limits"; else say "ROLLBACK INCOMPLETE - $1 needs attention (backup: $(basename "$DUMP"))"; fi
  exit 1
}
recreate() { $COMPOSE up -d --no-deps --force-recreate "$1" >/dev/null 2>&1; }

# --- 2. redis
recreate redis || fail redis "recreate"
wait_healthy nabdah-redis || fail redis "health"
[ "$(limit_mb nabdah-redis)" != none ] || fail redis "the container has no memory limit"
[ "$(redis_maxmemory)" = "$(conf_maxmemory_bytes)" ] || fail redis "maxmemory is not the one in redis.conf"
say "redis recreated: healthy, limit=$(limit_mb nabdah-redis), maxmemory as in redis.conf"
wait_code /api/v1/health/readiness 200 || fail redis "API readiness after redis"

# --- 3. mongodb
T0=$(date +%s)
recreate mongodb || fail mongodb "recreate"
wait_healthy nabdah-mongodb || fail mongodb "health"
for i in $(seq 1 "${OPS_WAIT_TRIES:-60}"); do is_primary && break; sleep "${OPS_WAIT_SLEEP:-5}"; done
is_primary || fail mongodb "not PRIMARY"
wait_code /api/v1/health/readiness 200 || fail mongodb "API readiness after mongodb"
T1=$(date +%s)
wait_healthy nabdah-backend || fail mongodb "backend health"
[ -z "$WORKER" ] || wait_healthy "$WORKER" || fail mongodb "worker health"
[ "$(limit_mb nabdah-mongodb)" != none ] || fail mongodb "the container has no memory limit"
say "mongodb recreated: healthy, PRIMARY, limit=$(limit_mb nabdah-mongodb), mongod.conf re-read; backend/worker healthy and the API ready without a restart of either"
say "mongodb_downtime_seconds=$((T1 - T0))"

# --- 4. livekit and coturn, only when no call is active
CALLS=$(active_calls)
if [ "${CALLS:-x}" = 0 ]; then
  for s in livekit coturn; do
    recreate $s || fail $s "recreate"
    sleep "${OPS_WAIT_SLEEP:-5}"
    [ "$(health nabdah-$s)" != exited ] && [ "$(health nabdah-$s)" != restarting ] || fail $s "not running"
    [ "$(limit_mb nabdah-$s)" != none ] || fail $s "the container has no memory limit"
    say "$s recreated: $(health nabdah-$s), limit=$(limit_mb nabdah-$s)"
  done
else
  say "livekit and coturn SKIPPED: active calls=${CALLS:-unknown} (window ${CALL_WINDOW_MIN} min); run the task again at a quieter time"
fi

# --- 5. the report
say "MemAvailable=$(mem_available_mb)MB after"
MEMREPORT_DOCKER="$DK" bash "$D/scripts/memory-report.sh" 2>&1 | grep '^status:' || say "memory-report printed no status lines"
say "applied"
exit 0
