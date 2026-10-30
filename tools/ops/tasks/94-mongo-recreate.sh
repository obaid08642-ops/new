#!/bin/bash
# Recreate ONLY nabdah-mongodb so the new memory settings apply (docker-compose.production.yml: limit and memswap 1600m, healthcheck 30s/10s/5/60s; mongod.conf: WiredTiger cache 0.6 GB).
# Two runs of the same task. Prints `status:` lines only: names, counts and sizes, never a secret (the credentials come from the container's own environment, the dump tool gets the
# password in a mode-600 file). The data volume is NEVER touched: no `down`, no `-v`, no volume removal; only `up -d --no-deps --force-recreate mongodb`.
#   Run 1 (APPLY empty): DRY RUN. Prints the restart count, exit code and OOMKilled of the running container, its memory limit now against the compose file, the use, MemAvailable, whether
#                        mongod is PRIMARY and the free room for the backup. Writes nothing, stops nothing.
#   Run 2 (APPLY=yes, set in this file by the reviewer): 1. pre-checks (mongodb, backend healthy; PRIMARY; the deploy lock free; room for the dump). 2. a fresh backup with the one-off dump
#                        (not inside the capped container): the file must be above 1 MB and at least half the last nightly, gzip-tested, AND `mongorestore --dryRun` must list at least one
#                        namespace from it. 3. only then: compose files copied next to the backup, `up -d --no-deps --force-recreate mongodb`, wait healthy and PRIMARY, the API ready, backend
#                        and worker healthy; the seconds of downtime are printed.
#   ROLLBACK (printed again if step 3 fails): the data volume is untouched, so the way back is the previous compose settings: put back the copied compose files
#                        ($B/mongo-recreate-<ts>-docker-compose.*.yml) over $D, run `sudo docker compose -f ... up -d --no-deps --force-recreate mongodb`; the dump
#                        ($B/pre-mongo-recreate-<ts>.gz) is the restore point if the data itself is ever in doubt. 92-recreate-datastores.sh with ONLY=mongodb is the older way to
#                        recreate it (it also rolls back to a limit-less container on a failure).
set -u
APPLY=""
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
ENVF=$D/.env.production
LOCK=${NABD_DEPLOY_LOCK:-/opt/nabdah/deploy.lock}
MIN_FREE_MB=${MIN_FREE_MB:-2048}
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
CT=nabdah-mongodb
H_API='Host: api.nabd.plus'
FILES="-f $D/docker-compose.production.yml"
[ -f "$D/docker-compose.release.yml" ] && FILES="$FILES -f $D/docker-compose.release.yml"
COMPOSE="$DK compose $FILES --project-directory $D --env-file $ENVF"
echo "## mongo-recreate"

say() { echo "status: mongo-recreate: $*"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
wait_healthy() { local s; for i in $(seq 1 "${OPS_WAIT_TRIES:-60}"); do s=$(health "$1"); [ "$s" = healthy ] && return 0; sleep "${OPS_WAIT_SLEEP:-5}"; done; say "$1 health=$s"; return 1; }
code() { curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H "$H_API" "https://127.0.0.1$1"; }
wait_code() { local c; for i in $(seq 1 "${OPS_WAIT_TRIES:-60}"); do c=$(code "$1"); [ "$c" = "$2" ] && return 0; sleep "${OPS_WAIT_SLEEP:-5}"; done; say "$1 answered $c, wanted $2"; return 1; }
limit_mb() { local b; b=$($DK inspect -f '{{.HostConfig.Memory}}' "$1" 2>/dev/null); [ "${b:-0}" -gt 0 ] 2>/dev/null && echo "$((b / 1048576))MB" || echo none; }
wanted_mb() { $COMPOSE config 2>/dev/null | awk -v s="$1" '$0 ~ "^  "s":$" {f=1; next} f && /^  [a-z]/ {f=0} f && /mem_limit:/ {print $2; exit}' ; }
mem_available_mb() { awk '/^MemAvailable:/ {print int($2/1024)}' "${OPS_MEMINFO:-/proc/meminfo}" 2>/dev/null; }
mongo_eval() { $DK exec $CT sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null | tail -1 | tr -d '\r'; }
is_primary() { [ "$(mongo_eval 'db.hello().isWritablePrimary')" = true ]; }
f() { $DK inspect -f "$1" $CT 2>/dev/null; }

say "state: status=$(f '{{.State.Status}}') restarts=$(f '{{.RestartCount}}') exit_code=$(f '{{.State.ExitCode}}') oom_killed=$(f '{{.State.OOMKilled}}') health=$(health $CT)"
say "limit now=$(limit_mb $CT), compose says=$(wanted_mb mongodb || true), memswap now=$(f '{{.HostConfig.MemorySwap}}') bytes, reservation now=$(f '{{.HostConfig.MemoryReservation}}') bytes"
say "use now: $($DK stats --no-stream --format '{{.MemUsage}} ({{.MemPerc}})' $CT 2>/dev/null) ; MemAvailable=$(mem_available_mb)MB"
is_primary && say "mongod: PRIMARY" || { say "ABORT mongod is not PRIMARY"; exit 1; }
sudo -n mkdir -p "$B"
FREE_MB=$(df -Pm "$B" 2>/dev/null | awk 'NR==2 {print $4}')
say "backup room: host_free_mb=${FREE_MB:-?} (need ${MIN_FREE_MB})"
if [ "$APPLY" != yes ]; then
  say "dry run only: nothing was written or stopped. APPLY would: take a one-off backup (size and archive listing checked), then recreate ONLY mongodb (about a minute of downtime); the data volume is not touched"
  exit 0
fi

# --- 1. pre-checks
if sudo -n test -e "$LOCK" 2>/dev/null; then say "ABORT the deploy lock exists ($LOCK): a deploy may be running"; exit 1; fi
for c in nabdah-mongodb nabdah-backend; do [ "$(health $c)" = healthy ] || { say "ABORT $c is not healthy ($(health $c))"; exit 1; }; done
$COMPOSE config -q >/dev/null 2>&1 || { say "ABORT the compose files do not validate"; exit 1; }
[ "${FREE_MB:-0}" -ge "$MIN_FREE_MB" ] 2>/dev/null || { say "ABORT only ${FREE_MB:-?} MB free where the backup goes (need $MIN_FREE_MB): nothing was stopped"; exit 1; }
WORKER=""; $DK inspect nabdah-worker >/dev/null 2>&1 && WORKER=nabdah-worker

# --- 2. the backup, in a one-off container (deploy/scripts/_mongodump-oneoff.sh and _mongorestore-list.sh verbatim; a test keeps the copies equal)
MONGO_ROOT_USER=$($DK exec $CT printenv MONGO_INITDB_ROOT_USERNAME 2>/dev/null); MONGO_ROOT_PASSWORD=$($DK exec $CT printenv MONGO_INITDB_ROOT_PASSWORD 2>/dev/null)
MONGODUMP_DOCKER="$DK"; MONGO_CONTAINER=$CT
mongodump_oneoff() {
  local out=$1; shift
  local dkr=${MONGODUMP_DOCKER:-docker} ctr=${MONGO_CONTAINER:-nabdah-mongodb} img net ip cfg="" err rc sz msg auth=()
  img=$($dkr inspect -f '{{.Config.Image}}' "$ctr" 2>/dev/null)
  net=$($dkr inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$ctr" 2>/dev/null | awk '{print $1}')
  ip=$([ -n "$net" ] && $dkr inspect -f "{{(index .NetworkSettings.Networks \"$net\").IPAddress}}" "$ctr" 2>/dev/null)
  if [ -z "$img" ] || [ -z "$net" ] || [ -z "$ip" ]; then echo "status: mongodump: ABORT cannot read the image, network or address of $ctr"; return 1; fi
  err=$(mktemp) || { echo "status: mongodump: ABORT no temp file"; return 1; }
  chmod 600 "$err"
  if [ -n "${MONGO_ROOT_USER:-}" ]; then   # production always has the root user; a test database without one is dumped without credentials
    cfg=$(mktemp) && chmod 600 "$cfg" || { echo "status: mongodump: ABORT no temp file"; rm -f "$err"; return 1; }
    printf "password: '%s'\n" "${MONGO_ROOT_PASSWORD//\'/\'\'}" > "$cfg"
    auth=(-v "$cfg:/cfg/mongodump.yml:ro")
  fi
  rc=0
  ( umask 077; $dkr run --rm -i --user 0:0 --network "$net" --memory 600m --memory-swap 600m --oom-score-adj 1000 "${auth[@]}" --entrypoint mongodump "$img" \
      --quiet ${cfg:+--config=/cfg/mongodump.yml --username="$MONGO_ROOT_USER" --authenticationDatabase=admin} --host="$ip" --port=27017 "$@" > "$out" 2> "$err" ) || rc=$?
  sz=$(stat -c %s "$out" 2>/dev/null || echo 0)   # (no `set -e` surprises: a failing dump must reach the report below)
  echo "status: mongodump: one-off container ($img on $net, 600m, no swap, oom_score_adj 1000) rc=$rc size_bytes=$sz"
  if [ "$rc" -ne 0 ] || { [ "$sz" -le 0 ] && [ -z "${MONGODUMP_ALLOW_EMPTY:-}" ]; }; then
    msg=$(tail -n 2 "$err" | tr '\n' ' '); [ -n "${MONGO_ROOT_PASSWORD:-}" ] && msg=${msg//"$MONGO_ROOT_PASSWORD"/<hidden>}; echo "status: mongodump: error: ${msg:0:250}"
    rm -f "$cfg" "$err"; return 1
  fi
  rm -f "$cfg" "$err"; chmod 600 "$out" 2>/dev/null
  return 0
}
mongorestore_list_oneoff() {
  local archive=$1
  local dkr=${MONGODUMP_DOCKER:-docker} ctr=${MONGO_CONTAINER:-nabdah-mongodb} img net ip cfg="" out rc=0 n auth=()
  img=$($dkr inspect -f '{{.Config.Image}}' "$ctr" 2>/dev/null)
  net=$($dkr inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$ctr" 2>/dev/null | awk '{print $1}')
  ip=$([ -n "$net" ] && $dkr inspect -f "{{(index .NetworkSettings.Networks \"$net\").IPAddress}}" "$ctr" 2>/dev/null)
  if [ -z "$img" ] || [ -z "$net" ] || [ -z "$ip" ]; then echo "status: mongorestore: ABORT cannot read the image, network or address of $ctr"; return 1; fi
  out=$(mktemp) && chmod 600 "$out" || { echo "status: mongorestore: ABORT no temp file"; return 1; }
  if [ -n "${MONGO_ROOT_USER:-}" ]; then
    cfg=$(mktemp) && chmod 600 "$cfg" || { echo "status: mongorestore: ABORT no temp file"; rm -f "$out"; return 1; }
    printf "password: '%s'\n" "${MONGO_ROOT_PASSWORD//\'/\'\'}" > "$cfg"
    auth=(-v "$cfg:/cfg/mongorestore.yml:ro")
  fi
  $dkr run --rm -i --user 0:0 --network "$net" --memory 600m --memory-swap 600m --oom-score-adj 1000 "${auth[@]}" --entrypoint mongorestore "$img" \
      --dryRun --verbose ${cfg:+--config=/cfg/mongorestore.yml --username="$MONGO_ROOT_USER" --authenticationDatabase=admin} --host="$ip" --port=27017 --archive --gzip < "$archive" > "$out" 2>&1 || rc=$?
  n=$(grep -c 'reading metadata for' "$out" || true)   # grep -c exits 1 on zero matches: never let that end a `set -e` caller silently
  echo "status: mongorestore: archive lists $n namespace(s) (dry run, rc=$rc)"
  if [ "$rc" -ne 0 ] || [ "$n" -lt 1 ]; then
    local msg; msg=$(tail -n 4 "$out" | tr '\n' ' '); [ -n "${MONGO_ROOT_PASSWORD:-}" ] && msg=${msg//"$MONGO_ROOT_PASSWORD"/<hidden>}
    echo "status: mongorestore: error: ${msg:0:400}"; rm -f "$cfg" "$out"; return 1
  fi
  rm -f "$cfg" "$out"
  return 0
}

DUMP=$B/pre-mongo-recreate-$TS.gz
DUMP_TMP=$(mktemp)
mongodump_oneoff "$DUMP_TMP" --gzip --archive; DUMP_RC=$?
SZ=$(stat -c %s "$DUMP_TMP" 2>/dev/null || echo 0)
LAST=$(sudo -n sh -c "ls -t $B/nabd_*.gz 2>/dev/null | head -1"); LASTSZ=$([ -n "$LAST" ] && sudo -n stat -c %s "$LAST" || echo 0)
GZ=invalid; gzip -t "$DUMP_TMP" 2>/dev/null && GZ=ok
LIST=failed; [ "$DUMP_RC" -eq 0 ] && mongorestore_list_oneoff "$DUMP_TMP" && LIST=ok
say "backup steps: mongodump rc=$DUMP_RC ; size_bytes=$SZ ; last nightly $LASTSZ ; gzip=$GZ ; archive listing=$LIST"
if [ "$DUMP_RC" -ne 0 ] || [ "$SZ" -le 1048576 ] || [ "$SZ" -lt $((LASTSZ / 2)) ] || [ "$GZ" != ok ] || [ "$LIST" != ok ]; then
  rm -f "$DUMP_TMP"; say "ABORT the backup is not usable (see the steps above): nothing was stopped"; exit 1
fi
sudo -n install -m 600 "$DUMP_TMP" "$DUMP" || { rm -f "$DUMP_TMP"; say "ABORT cannot keep the backup in $B: nothing was stopped"; exit 1; }
rm -f "$DUMP_TMP"
say "backup ok ($(basename "$DUMP"), $((SZ / 1048576)) MB; last nightly $((LASTSZ / 1048576)) MB)"
for fl in docker-compose.production.yml docker-compose.release.yml; do sudo -n test -f "$D/$fl" && sudo -n cp -p "$D/$fl" "$B/mongo-recreate-$TS-$fl"; done
say "compose files copied to $B (mongo-recreate-$TS-*); rollback: put them back over $D and run 'up -d --no-deps --force-recreate mongodb'; restore point: $(basename "$DUMP")"

# --- 3. only mongodb
T0=$(date +%s)
fail() { say "FAILED at '$1'. The data volume is untouched. ROLLBACK: put back $B/mongo-recreate-$TS-docker-compose.*.yml over $D, then 'sudo docker compose $FILES --project-directory $D --env-file $ENVF up -d --no-deps --force-recreate mongodb'; restore point $(basename "$DUMP")"; exit 1; }
$COMPOSE up -d --no-deps --force-recreate mongodb >/dev/null 2>&1 || fail "recreate"
wait_healthy $CT || fail "health"
for i in $(seq 1 "${OPS_WAIT_TRIES:-60}"); do is_primary && break; sleep "${OPS_WAIT_SLEEP:-5}"; done
is_primary || fail "not PRIMARY"
wait_code /api/v1/health/readiness 200 || fail "API readiness"
T1=$(date +%s)
wait_healthy nabdah-backend || fail "backend health"
[ -z "$WORKER" ] || wait_healthy "$WORKER" || fail "worker health"
[ "$(limit_mb $CT)" != none ] || fail "the container has no memory limit"
say "mongodb recreated: healthy, PRIMARY, limit=$(limit_mb $CT), restarts=$(f '{{.RestartCount}}'); backend/worker healthy and the API ready"
say "mongodb_downtime_seconds=$((T1 - T0)) ; MemAvailable=$(mem_available_mb)MB after"
exit 0
