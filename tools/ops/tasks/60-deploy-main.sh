#!/bin/bash
# ops-detach: runs detached on the server (see server-inspect.yml); the workflow polls its log.
# Deploy of main to production (build brief 2026-10-14 §5.3). Rehearsed in .github/workflows/ops-rehearsal.yml
# (job deploy-main: forced failure -> rollback, then the real deploy, then a second run on the same release).
# The images are built on the GitHub runner (tools/ops/release/build-release.sh) and copied to
# /opt/nabdah/releases/<sha8>/ by the server-ops workflow before this task runs; nothing is built on this host.
#   0. pre-checks: release files and checksums, running stack healthy, nginx -t, disk
#   1. MongoDB backup (mongodump, gzip) checked against the last nightly size
#   2. rollback point: running images tagged rollback-<ts>; the deploy files and .env.production saved
#   3. docker load the release images
#   3b. apply four insert-only migrations (catalog-json-to-db, feature-flags-collection, sync-profile-type-geo,
#       backfill-provider-geopoint), counts only; the others stay held (reviewer decision 2026-10-14)
#   4. deploy files from main (compose, nginx); env: METRICS_SCRAPE_TOKEN (new), MEILI_MASTER_KEY (if missing)
#   5. up: meilisearch, backend + worker, admin-web + patient-web, nginx (no other service is touched)
#   6. checks: health, readiness background_worker=up, site/admin/API 200, metrics 404 without token,
#      cache MISS->HIT on a public answer and BYPASS with Authorization
# Any failure in 3-6: files, env and images back, worker and meilisearch removed, old stack verified; exit 1.
# Secret values are never printed. REHEARSE_COMMIT_FAIL=<service> forces the export fallback of the rollback image.
# REHEARSE_FAIL_AT=<step> forces a failure; REHEARSE_MISSING_IMAGE=<service> treats
# that service's running image as gone from the host, as patient-web's is in production (rehearsal only).
set -u
SHA=${OPS_RELEASE_SHA:-8975b933aa5098cda63a410e97405af68bb5b4d1}
S8=${SHA:0:8}
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
REL=${OPS_RELEASE_DIR:-/opt/nabdah/releases}/$S8
TS=$(date -u +%Y%m%dT%H%M%SZ)
DK="sudo -n docker"
ENVF=$D/.env.production
FAIL_AT=${REHEARSE_FAIL_AT:-}
NEW="docker-compose.production.yml docker-compose.release.yml nginx/nginx.conf nginx/conf.d/nabd.plus.conf nginx/conf.d/nabd-web.conf nginx/snippets/api-microcache.conf"
APP_SERVICES="backend admin-web patient-web"
COMPOSE_OLD="$DK compose -f $D/docker-compose.production.yml --project-directory $D --env-file $ENVF"
COMPOSE="$DK compose -f $D/docker-compose.production.yml -f $D/docker-compose.release.yml --project-directory $D --env-file $ENVF"
H_API='Host: api.nabd.plus'
echo "## deploy-main ${S8}"
# what runs now (written by the last deploy of this task; absent if the stack was deployed another way)
echo "status: deploy running_before=$(sudo -n cat $D/RELEASE 2>/dev/null | awk '{print substr($1,1,12)}' || true) images=$(for c in backend patient-web admin-web; do printf '%s:%s ' $c "$($DK inspect -f '{{.Config.Image}}' nabdah-$c 2>/dev/null | sed 's/.*://')"; done)"
echo "status: deploy disk_before=$(df -P / | awk 'NR==2{print $5}')"

health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
wait_healthy() { local s; for i in $(seq 1 "$2"); do s=$(health "$1"); [ "$s" = healthy ] && return 0; sleep 5; done; echo "deploy: $1 health=$s"; return 1; }
code() { curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H "$1" "https://127.0.0.1$2"; }
wait_code() { local c; for i in $(seq 1 "$4"); do c=$(code "$1" "$2"); [ "$c" = "$3" ] && return 0; sleep 5; done; echo "deploy: $2 ($1) answered $c, wanted $3"; return 1; }
forced() { [ "$FAIL_AT" = "$1" ] && echo "deploy: (rehearsal) forced failure at $1" && return 0; return 1; }
nginx_ok() { $DK exec nabdah-nginx nginx -t >/dev/null 2>&1; }

# ---------------------------------------------------------------- 0. pre-checks
[ -f "$REL/SHA256SUMS" ] && (cd "$REL" && sha256sum -c --quiet SHA256SUMS) || { echo "deploy: ABORT release $S8 missing or checksum mismatch"; exit 1; }
[ "$(cat "$REL/SHA")" = "$SHA" ] || { echo "deploy: ABORT release SHA differs from the pinned SHA"; exit 1; }
for c in nabdah-backend nabdah-mongodb nabdah-redis nabdah-nginx; do [ "$(health $c)" = healthy ] || { echo "deploy: ABORT $c not healthy before starting"; exit 1; }; done
nginx_ok || { echo "deploy: ABORT nginx -t fails before starting"; exit 1; }
FREE=$(df -Pk / | awk 'NR==2{print int($4/1048576)}')
# 2026-10-22: loading a release needs ~7 GB (run 39858901688 filled the disk). Before the check, remove what no container
# uses: older release upload dirs, and nabdah-* image tags that are neither running nor this release (old rollback points
# of releases older than the running one). Never a volume, never a running image, never a backup.
RUNIMG=$($DK ps --format '{{.Image}}' | sort -u)
for dir in $(sudo -n ls -1 ${OPS_RELEASE_DIR:-/opt/nabdah/releases} 2>/dev/null); do [ "$dir" = "$S8" ] || sudo -n rm -rf "${OPS_RELEASE_DIR:-/opt/nabdah/releases}/$dir"; done
for t in $($DK images --format '{{.Repository}}:{{.Tag}}' | grep -E '^nabdah-' | grep -v ":$S8\$"); do
  echo "$RUNIMG" | grep -qx "$t" && continue
  RID=$($DK image inspect -f '{{.Id}}' "$t" 2>/dev/null)
  for c in $($DK ps -q); do [ "$($DK inspect -f '{{.Image}}' $c)" = "$RID" ] && continue 2; done
  $DK rmi "$t" >/dev/null 2>&1
done
$DK image prune -f >/dev/null 2>&1; $DK builder prune -f --filter "until=72h" >/dev/null 2>&1
FREE=$(df -Pk / | awk 'NR==2{print int($4/1048576)}')
echo "status: deploy free_gb_after_precleanup=$FREE"
[ "$FREE" -ge 9 ] || { echo "deploy: ABORT only ${FREE} GB free on / (9 needed to load a release)"; exit 1; }
wait_code "$H_API" /api/v1/health/liveness 200 3 || { echo "deploy: ABORT api not 200 before starting"; exit 1; }
echo "deploy: pre-checks ok (release $S8 verified, stack healthy, ${FREE} GB free)"

# ---------------------------------------------------------------- 1. MongoDB backup
sudo -n mkdir -p $B
DUMP=$B/pre-deploy-$S8-$TS.gz
# mongodump in a ONE-OFF container (600m, no swap, oom_score_adj 1000) on mongod's network, NOT inside the capped nabdah-mongodb (runs 55/57: 0-byte dumps).
# The function is deploy/scripts/_mongodump-oneoff.sh verbatim; the credentials come from the container's own environment, never from the command line.
MONGO_ROOT_USER=$($DK exec nabdah-mongodb printenv MONGO_INITDB_ROOT_USERNAME 2>/dev/null); MONGO_ROOT_PASSWORD=$($DK exec nabdah-mongodb printenv MONGO_INITDB_ROOT_PASSWORD 2>/dev/null)
MONGODUMP_DOCKER="$DK"; MONGO_CONTAINER=nabdah-mongodb
mongodump_oneoff() {
  local out=$1; shift
  local dkr=${MONGODUMP_DOCKER:-docker} ctr=${MONGO_CONTAINER:-nabdah-mongodb} img net ip cfg="" err rc sz msg auth=() attempt avail cap name state ec oom
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
  # Run 61 (2026-10-30): "rc=1 size_bytes=300688232" with an EMPTY error: the container was killed (no stderr to read). So: no --rm, the container is inspected for its real
  # exit code and OOMKilled before it is removed; one collection at a time (--numParallelCollections=1: the least memory); the cap follows MemAvailable (600m at most, 350m at least,
  # MemAvailable minus 250 MB between); one retry, with the cap read again. Only exit 0 AND a non-empty file is a success.
  for attempt in 1 2; do
    avail=$(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo 2>/dev/null); avail=${avail:-0}
    cap=600; [ "$avail" -gt 0 ] && cap=$((avail - 250)); [ "$cap" -gt 600 ] && cap=600; [ "$cap" -lt 350 ] && cap=350
    name="nabd-dump-$$-$attempt"; rc=0; : > "$err"
    ( umask 077; $dkr run --name "$name" --user 0:0 --network "$net" --memory "${cap}m" --memory-swap "${cap}m" --oom-score-adj 1000 "${auth[@]}" --entrypoint mongodump "$img" \
        --quiet --numParallelCollections=1 ${cfg:+--config=/cfg/mongodump.yml --username="$MONGO_ROOT_USER" --authenticationDatabase=admin} --host="$ip" --port=27017 "$@" > "$out" 2> "$err" ) || rc=$?
    state=$($dkr inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' "$name" 2>/dev/null); ec=${state% *}; oom=${state#* }
    $dkr rm -f "$name" >/dev/null 2>&1 || true
    [ -n "$ec" ] && [ "$ec" != 0 ] && [ "$rc" = 0 ] && rc=$ec
    sz=$(stat -c %s "$out" 2>/dev/null || echo 0)   # (no `set -e` surprises: a failing dump must reach the report below)
    echo "status: mongodump: attempt $attempt: one-off container ($img on $net, cap ${cap}m of MemAvailable ${avail}m, no swap, oom_score_adj 1000, 1 collection at a time) rc=$rc exit_code=${ec:-?} oom_killed=${oom:-?} size_bytes=$sz"
    if [ "$rc" -eq 0 ] && { [ "$sz" -gt 0 ] || [ -n "${MONGODUMP_ALLOW_EMPTY:-}" ]; }; then break; fi
    msg=$(tail -n 5 "$err" | tr '\n' ' '); [ -n "${MONGO_ROOT_PASSWORD:-}" ] && msg=${msg//"$MONGO_ROOT_PASSWORD"/<hidden>}
    [ -z "${msg// /}" ] && msg="no error text (exit $rc${oom:+, OOMKilled=$oom}; 137 means the container was killed, usually for memory)"
    echo "status: mongodump: attempt $attempt error: ${msg:0:400}"
    [ "$attempt" = 1 ] && sleep "${MONGODUMP_RETRY_WAIT:-5}"
  done
  rm -f "$cfg" "$err"
  if [ "$rc" -ne 0 ] || { [ "$sz" -le 0 ] && [ -z "${MONGODUMP_ALLOW_EMPTY:-}" ]; }; then return 1; fi
  chmod 600 "$out" 2>/dev/null
  return 0
}
DUMP_TMP=$(mktemp); mongodump_oneoff "$DUMP_TMP" --gzip --archive && sudo -n install -m 600 "$DUMP_TMP" "$DUMP"
rm -f "$DUMP_TMP"
sudo -n chmod 600 "$DUMP" 2>/dev/null
SZ=$(sudo -n stat -c %s "$DUMP" 2>/dev/null || echo 0)
LAST=$(sudo -n sh -c "ls -t $B/nabd_*.gz 2>/dev/null | head -1")
LASTSZ=$([ -n "$LAST" ] && sudo -n stat -c %s "$LAST" || echo 0)
# a full dump is at least half the last nightly (the nightly holds the app database only)
[ "$SZ" -gt 1048576 ] && [ "$SZ" -ge $((LASTSZ / 2)) ] || { echo "deploy: ABORT backup too small ($SZ bytes; last nightly $LASTSZ)"; exit 1; }
gunzip -t <(sudo -n cat "$DUMP") 2>/dev/null || { echo "deploy: ABORT backup is not a valid gzip"; exit 1; }
echo "deploy: backup ok ($(basename $DUMP), $((SZ / 1048576)) MB; last nightly $((LASTSZ / 1048576)) MB)"

# ---------------------------------------------------------------- 2. rollback point
declare -A OLDIMG OLDREF
for s in $APP_SERVICES; do
  OLDIMG[$s]=$($DK inspect -f '{{.Image}}' nabdah-$s)
  OLDREF[$s]=$($DK inspect -f '{{.Config.Image}}' nabdah-$s)
  # preflight 2026-10-14: the running patient-web's image was deleted from the host (the container still runs it);
  # without an image there is nothing to roll back to, so the running container is committed as the rollback image
  if [ "${REHEARSE_MISSING_IMAGE:-}" = "$s" ] || ! $DK image inspect "${OLDIMG[$s]}" >/dev/null 2>&1; then
    # production 2026-10-15: `docker commit` failed on patient-web (its image is gone from the host). Fallback: export the
    # container's filesystem and import it with the image settings that matter (command, entrypoint, workdir, user,
    # port, PATH/NODE_ENV); compose supplies the rest of the environment, so no secret is baked into the image.
    if [ "${REHEARSE_COMMIT_FAIL:-}" = "$s" ] || ! CERR=$($DK commit nabdah-$s "nabdah-$s:rollback-$TS" 2>&1 >/dev/null); then
      echo "deploy: commit of $s failed ($(echo "${CERR:-forced in rehearsal}" | tr '\n' ' ' | sed 's/ *$//' | cut -c1-160)); exporting its filesystem instead"
      CH=()
      J=$($DK inspect -f '{{json .Config.Entrypoint}}' nabdah-$s); [ "$J" != null ] && [ "$J" != '[]' ] && CH+=(--change "ENTRYPOINT $J")
      J=$($DK inspect -f '{{json .Config.Cmd}}' nabdah-$s); [ "$J" != null ] && [ "$J" != '[]' ] && CH+=(--change "CMD $J")
      J=$($DK inspect -f '{{.Config.WorkingDir}}' nabdah-$s); [ -n "$J" ] && CH+=(--change "WORKDIR $J")
      J=$($DK inspect -f '{{.Config.User}}' nabdah-$s); [ -n "$J" ] && CH+=(--change "USER $J")
      for p in $($DK inspect -f '{{range $k,$v := .Config.ExposedPorts}}{{$k}} {{end}}' nabdah-$s); do CH+=(--change "EXPOSE $p"); done
      for e in $($DK inspect -f '{{range .Config.Env}}{{println .}}{{end}}' nabdah-$s | grep -E '^(PATH|NODE_ENV|NODE_VERSION|YARN_VERSION|HOSTNAME|PORT|NEXT_TELEMETRY_DISABLED)='); do
        CH+=(--change "ENV $e")
      done
      $DK export nabdah-$s | $DK import "${CH[@]}" - "nabdah-$s:rollback-$TS" >/dev/null 2>&1 \
        || { echo "deploy: ABORT cannot keep a rollback image of $s (commit and export both failed)"; exit 1; }
    fi
    OLDIMG[$s]=$($DK image inspect -f '{{.Id}}' "nabdah-$s:rollback-$TS")
    echo "deploy: $s ran an image no longer on the host; its container was committed as the rollback image"
  fi
  $DK tag "${OLDIMG[$s]}" "nabdah-$s:rollback-$TS" || { echo "deploy: ABORT cannot tag the rollback image of $s"; exit 1; }
done
SNAP=$B/deploy-files-pre-$S8-$TS.tgz
sudo -n tar -czf "$SNAP" -C $D --ignore-failed-read $NEW .env.production 2>/dev/null
sudo -n chmod 600 "$SNAP"
sudo -n tar -tzf "$SNAP" | grep -qx '.env.production' || { echo "deploy: ABORT snapshot of the deploy files failed"; exit 1; }
# files that did not exist before (removed again on rollback)
ABSENT=""; for f in $NEW; do sudo -n test -e "$D/$f" || ABSENT="$ABSENT $f"; done
echo "deploy: rollback point: images tagged rollback-$TS (${OLDREF[backend]}, ${OLDREF[admin-web]}, ${OLDREF[patient-web]}); files saved"

WORKER_BEFORE=$($DK ps -aq -f name=^nabdah-worker$); MEILI_BEFORE=$($DK ps -aq -f name=^nabdah-meilisearch$)
rollback() {
  echo "deploy: FAILED at '$1', rolling back"
  # what the new containers said before they are replaced (into the encrypted report only; masked)
  # every evidence command is capped at 20 s: production run 38672346219 hung here on `docker logs` of the old
  # patient-web container (its image is gone from the host) until the workflow stopped polling, before the rollback ran
  for c in nabdah-patient-web nabdah-nginx nabdah-backend; do
    echo "evidence: -- $c"
    timeout 20 $DK logs --tail 25 $c 2>&1 | sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/<email>/g; s/\+?[0-9][0-9 ()-]{8,}[0-9]/<number>/g' \
      | grep -viE 'password|secret|token|authorization|cookie' | cut -c1-300 | sed 's/^/evidence:   /'
  done
  echo "evidence: -- GET /ar (Host: nabd.plus) headers"; curl -sk -o /dev/null -D - --max-time 10 -H 'Host: nabd.plus' https://127.0.0.1/ar | tr -d '\r' | grep -iE '^(HTTP|location|x-|cache-control|content-type|content-security)' | cut -c1-120 | sed 's/^/evidence:   /'
  echo "evidence: -- who answers: names as nginx resolves them, the containers' real addresses and start times"
  timeout 20 $DK exec nabdah-nginx getent hosts patient-web admin-web backend 2>&1 | sed 's/^/evidence:   nginx sees /'
  for c in nabdah-patient-web nabdah-admin-web nabdah-backend nabdah-nginx; do
    echo "evidence:   $c $(timeout 20 $DK inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}started={{.State.StartedAt}} image={{.Config.Image}}' $c 2>&1)"
  done
  echo "evidence:   patient-web itself: /ar -> $(timeout 20 $DK exec nabdah-patient-web wget -q -S -O /dev/null http://127.0.0.1:3000/ar 2>&1 | grep -m1 'HTTP/' | tr -d '\r')"
  echo "evidence:   from nginx: patient-web:3000/ar -> $(timeout 20 $DK exec nabdah-nginx wget -q -S -O /dev/null http://patient-web:3000/ar 2>&1 | grep -m1 'HTTP/' | tr -d '\r')"
  echo "evidence:   from nginx: admin-web:3000/ar -> $(timeout 20 $DK exec nabdah-nginx wget -q -S -O /dev/null http://admin-web:3000/ar 2>&1 | grep -m1 'HTTP/' | tr -d '\r')"
  sudo -n tar -xzf "$SNAP" -C $D
  for f in $ABSENT; do sudo -n rm -f "$D/$f"; done
  for s in $APP_SERVICES; do $DK tag "${OLDIMG[$s]}" "${OLDREF[$s]}"; done
  # only what this deploy added is removed; a worker or meilisearch that ran before comes back on the old image
  [ -n "$WORKER_BEFORE" ] || $DK rm -f nabdah-worker >/dev/null 2>&1
  [ -n "$MEILI_BEFORE" ] || $DK rm -f nabdah-meilisearch >/dev/null 2>&1
  RB="$COMPOSE_OLD"; sudo -n test -f $D/docker-compose.release.yml && RB="$COMPOSE"
  RBS="$APP_SERVICES nginx"; [ -n "$WORKER_BEFORE" ] && RBS="$RBS worker"
  $RB up -d --no-build --no-deps --force-recreate $RBS >/dev/null 2>&1
  [ -n "$MEILI_BEFORE" ] && $RB up -d --no-build --no-deps meilisearch >/dev/null 2>&1
  local ok=1
  wait_healthy nabdah-backend 48 || ok=0
  for s in $APP_SERVICES; do [ "$($DK inspect -f '{{.Image}}' nabdah-$s)" = "${OLDIMG[$s]}" ] || { echo "deploy: $s is not on its old image"; ok=0; }; done
  nginx_ok && $DK exec nabdah-nginx nginx -s reload >/dev/null 2>&1 || ok=0
  wait_code "$H_API" /api/v1/health/liveness 200 12 || ok=0
  wait_code 'Host: nabd.plus' /ar 200 12 || ok=0
  [ $ok = 1 ] && echo "deploy: rollback complete, old images and files back, api and site 200" || echo "deploy: ROLLBACK INCOMPLETE - needs attention"
  echo "deploy: backup kept at $(basename $DUMP)"
  exit 1
}

# ---------------------------------------------------------------- 3. load images
gunzip -c "$REL/images.tar.gz" | $DK load -q >/dev/null 2>&1 || rollback "docker load"
for i in nabdah-prod-backend nabdah-prod-admin-web nabdah-patient-web; do $DK image inspect "$i:$S8" >/dev/null 2>&1 || rollback "image $i:$S8 not loaded"; done
echo "deploy: release images loaded"

# ---------------------------------------------------------------- 3b. migrations (reviewer decision 2026-10-14)
# Only these four, all insert-only and idempotent; the rest of the dry-run list is held for a later run. They run
# after the backup and before any new container starts, in the release's migrations image on the internal network.
# Credentials only in a mode-600 env file that is removed; output is counts, with e-mails and numbers masked.
# A failure rolls the deploy back; rows already inserted stay (insert-only, and the old code does not read them).
# Release 79a3d84b (2026-10-22, urgent: next 16.4.2 security fix): no script migration runs. The four above ran on
# 2026-10-15; the new data scripts (catalogue images/ingredients/variant groups, insurance official/orphan networks,
# services content/dedupe, unify lab list) change data and get their own reviewed run. The audit-collection move (#1758)
# runs by itself at backend start (copy with $setOnInsert, rename only after every row is copied; safe to repeat).
MIGRATIONS=""
[ -z "$MIGRATIONS" ] || $DK image inspect nabdah-migrations:$S8 >/dev/null 2>&1 || rollback "image nabdah-migrations:$S8 not loaded"
MNET=$($DK inspect nabdah-mongodb -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
MDB=$(sudo -n grep -E '^DB_NAME=' $ENVF | cut -d= -f2); MDB=${MDB:-nabd_nestjs}
MEF=$(mktemp); chmod 600 $MEF
U=$($DK exec nabdah-mongodb printenv MONGO_INITDB_ROOT_USERNAME); P=$($DK exec nabdah-mongodb printenv MONGO_INITDB_ROOT_PASSWORD)
urlenc() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""),end="")' "$1"; }
# the database goes in the URI path: 2026-09-catalog-json-to-db reads the URI's database and ignores DB_NAME
MURI="mongodb://$(urlenc "$U"):$(urlenc "$P")@mongodb:27017/$MDB?authSource=admin&directConnection=true"
printf 'MONGODB_URI=%s\nMONGO_URL=%s\nDB_NAME=%s\n' "$MURI" "$MURI" "$MDB" > $MEF
unset MURI
unset U P
mmask() { sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/<email>/g; s/\+?[0-9][0-9 ()-]{8,}[0-9]/<number>/g' | grep -viE 'password|secret|token|npm notice' | cut -c1-300; }
for m in $MIGRATIONS; do
  echo "migrate: $m --apply"
  timeout 600 $DK run --rm --network "$MNET" --env-file $MEF --memory 768m nabdah-migrations:$S8 \
    npx ts-node --transpile-only "scripts/migrations/$m.ts" --apply > $MEF.out 2>&1
  rc=$?
  mmask < $MEF.out | tail -30 | sed 's/^/migrate:   /'
  echo "migrate: $m exit=$rc"
  [ $rc = 0 ] || { rm -f $MEF $MEF.out; rollback "migration $m"; }
done
rm -f $MEF $MEF.out
echo "deploy: migrations applied: $MIGRATIONS (database $MDB)"
forced migrations && rollback "migrations (forced)"

# ---------------------------------------------------------------- 4. files and env
W=$(mktemp -d); tar -xzf "$REL/deploy.tgz" -C $W || rollback "unpack deploy.tgz"
# The server's api vhost carries the Q107 hotfix (social sign-in answers 403) that main does not have; it stays until
# the owner decides to lift it (a separate change), so it is carried into main's file.
Q107='  location = /api/v1/auth/social-login { default_type application/json; return 403 '"'"'{"statusCode":403,"message":"social_login_temporarily_disabled"}'"'"'; } # Q107 hotfix: social-login off until the verified backend is deployed'
if sudo -n grep -qF 'social_login_temporarily_disabled' $D/nginx/conf.d/nabd.plus.conf; then
  awk -v l="$Q107" '{print} /^  server_name api\.nabd\.plus;$/ && !d {print l; d=1}' "$W/deploy/nginx/conf.d/nabd.plus.conf" > "$W/q107" && mv "$W/q107" "$W/deploy/nginx/conf.d/nabd.plus.conf"
  grep -qF 'social_login_temporarily_disabled' "$W/deploy/nginx/conf.d/nabd.plus.conf" || { rm -rf $W; rollback "Q107 hotfix not carried over"; }
  echo "deploy: Q107 hotfix (social sign-in 403) kept in the api vhost"
fi
for f in $NEW; do
  [ "$f" = docker-compose.release.yml ] && continue
  [ -f "$W/deploy/$f" ] || { rm -rf $W; rollback "main has no deploy/$f"; }
  sudo -n mkdir -p "$(dirname "$D/$f")"
  sudo -n sh -c "cat '$W/deploy/$f' > '$D/$f'"
done
rm -rf $W
sudo -n tee $D/docker-compose.release.yml >/dev/null <<EOF
# Written by tools/ops/tasks/60-deploy-main.sh: the release images built on the runner from main@$S8.
services:
  backend: { image: "nabdah-prod-backend:$S8", pull_policy: never }
  worker: { image: "nabdah-prod-backend:$S8", pull_policy: never }
  admin-web: { image: "nabdah-prod-admin-web:$S8", pull_policy: never }
  patient-web: { image: "nabdah-patient-web:$S8", pull_policy: never }
EOF
TE=$(mktemp); sudo -n cat $ENVF > $TE; ADDED=""
grep -qE '^METRICS_SCRAPE_TOKEN=.{32,}' $TE || { sed -i '/^METRICS_SCRAPE_TOKEN=/d' $TE; echo "METRICS_SCRAPE_TOKEN=$(openssl rand -hex 32)" >> $TE; ADDED="$ADDED METRICS_SCRAPE_TOKEN"; }
grep -qE '^MEILI_MASTER_KEY=[0-9a-f]{32,}' $TE || { sed -i '/^MEILI_MASTER_KEY=/d' $TE; echo "MEILI_MASTER_KEY=$(openssl rand -hex 32)" >> $TE; ADDED="$ADDED MEILI_MASTER_KEY"; }
OLDN=$(sudo -n grep -cE '^[A-Z_][A-Z0-9_]*=' $ENVF); NEWN=$(grep -cE '^[A-Z_][A-Z0-9_]*=' $TE)
ADDN=$(echo $ADDED | wc -w)
[ "$NEWN" = $((OLDN + ADDN)) ] || { rm -f $TE; rollback "env rewrite check (names $OLDN -> $NEWN, added $ADDN)"; }
sudo -n sh -c "cat $TE > $ENVF"; rm -f $TE
echo "deploy: files from main written ($NEW); env names added:${ADDED:- none}"
$COMPOSE config -q >/dev/null 2>&1 || rollback "compose config invalid"

# ---------------------------------------------------------------- 5. up (named services only, no dependency restarts)
# 16.5: the backend refuses every upload while ClamAV cannot answer (UPLOAD_SCAN=required), so the scanner is up and
# healthy before the new backend starts. Its first start downloads the signatures (a few minutes) and it needs ~1.2 GB
# of memory: with less available it is not started, and a scanner that fails to start never fails the deploy (uploads stay refused).
if [ "$(health nabdah-clamav)" != healthy ]; then
  MEMAV=$(awk '/^MemAvailable:/{print int($2/1024)}' /proc/meminfo)
  echo "status: deploy clamav=starting mem_available_mb=$MEMAV"
  if [ "${MEMAV:-0}" -ge 1500 ]; then
    # a scanner that does not start or does not become healthy does NOT fail the deploy (2026-10-29, lead): the backend keeps refusing uploads
    # (UPLOAD_SCAN=required) exactly as with SKIPPED_LOW_MEMORY, nothing is accepted unscanned, and everything else is deployed
    if ! $COMPOSE up -d --no-build --no-deps clamav >/dev/null 2>&1 || ! wait_healthy nabdah-clamav 120; then
      echo "status: deploy clamav=FAILED_START uploads_refused_until_scanner_runs"
    fi
  else
    # not enough memory: the scanner is not started (the stack ran without it before this deploy too, so uploads stay
    # refused exactly as before, never accepted unscanned); the owner is told the server needs more memory
    echo "status: deploy clamav=SKIPPED_LOW_MEMORY mem_available_mb=$MEMAV uploads_refused_until_scanner_runs"
  fi
fi
echo "status: deploy clamav=$(health nabdah-clamav)"
$COMPOSE up -d --no-build --no-deps meilisearch >/dev/null 2>&1 || rollback "meilisearch up"
wait_healthy nabdah-meilisearch 24 || rollback "meilisearch health"
$COMPOSE up -d --no-build --no-deps backend worker >/dev/null 2>&1 || rollback "backend/worker up"
forced backend && rollback "backend (forced)"
wait_healthy nabdah-backend 48 || rollback "backend health"
wait_healthy nabdah-worker 48 || rollback "worker health"
$COMPOSE up -d --no-build --no-deps admin-web patient-web >/dev/null 2>&1 || rollback "admin-web/patient-web up"
wait_healthy nabdah-admin-web 36 || rollback "admin-web health"
$COMPOSE up -d --no-build --no-deps nginx >/dev/null 2>&1 || rollback "nginx up"
wait_healthy nabdah-nginx 24 || rollback "nginx health"
nginx_ok || rollback "nginx -t"
# nginx resolves upstream names (patient-web, admin-web, backend) once, when it loads its config. When compose leaves the
# nginx container as it is (no change in its definition), it keeps the addresses of the containers it saw at its start,
# and the recreated app containers may come back with each other's addresses: rehearsal run 38664756357 had nabd.plus
# sent to admin-web (patient-web's old address), 404 on /ar. A reload after the app containers are up re-resolves them.
$DK exec nabdah-nginx nginx -s reload >/dev/null 2>&1 || rollback "nginx reload"
sleep 2
for s in backend worker admin-web patient-web; do
  img=$($DK inspect -f '{{.Config.Image}}' nabdah-$s); case $img in *:$S8) ;; *) rollback "$s runs $img, not the release";; esac
done
echo "deploy: meilisearch, backend, worker, admin-web, patient-web, nginx up on $S8"
echo "evidence: start order: $(for c in patient-web admin-web nginx; do printf '%s=%s ' $c "$($DK inspect -f '{{.State.StartedAt}}' nabdah-$c | cut -c12-23)"; done)"

# ---------------------------------------------------------------- 6. checks
forced checks && rollback "checks (forced)"
wait_code "$H_API" /api/v1/health/liveness 200 24 || rollback "api liveness"
R=""; for i in $(seq 1 24); do R=$(curl -sk --max-time 10 -H "$H_API" https://127.0.0.1/api/v1/health/readiness); echo "$R" | grep -q '"background_worker":"up"' && break; sleep 5; done
echo "$R" | grep -q '"status":"ok"' && echo "$R" | grep -q '"background_worker":"up"' || rollback "readiness: $(echo "$R" | head -c 200)"
echo "deploy: readiness ok, background_worker up"
wait_code 'Host: nabd.plus' /ar 200 24 || rollback "site /ar"
wait_code 'Host: admin.nabd.plus' /login 200 12 || rollback "admin /login"   # / sends a signed-out visitor to /login (307)
M=$(code "$H_API" /api/v1/observability/metrics); [ "$M" = 404 ] || rollback "metrics without token answered $M (wanted 404)"
echo "deploy: site 200, admin /login 200, api 200, metrics 404 without token"
C=/api/v1/catalogs/specialties
x() { curl -sk -o /dev/null -D - --max-time 10 -H "$H_API" "$@" "https://127.0.0.1$C?deploy=$TS" | tr -d '\r' | awk -F': ' 'tolower($1)=="x-cache-status"{print $2}'; }
C1=$(x); C2=$(x); C3=$(x -H 'Authorization: Bearer deploy-check')
echo "deploy: X-Cache-Status on $C: first=${C1:-none} second=${C2:-none} with Authorization=${C3:-none}"
[ "$C3" = HIT ] && rollback "an answer with Authorization was served from the cache"
[ "$C1" = MISS ] && [ "$C2" = HIT ] && [ "$C3" = BYPASS ] && echo "deploy: cache MISS -> HIT, BYPASS with Authorization" \
  || echo "deploy: WARNING cache statuses not as expected (not rolled back: no answer was shared across callers)"

echo "$SHA $TS" | sudo -n tee $D/RELEASE >/dev/null
# dangling images and build cache older than 72 h only (never volumes, never tagged images: the rollback tags stay)
$DK image prune -f --filter "until=72h" >/dev/null 2>&1; $DK builder prune -f --filter "until=72h" >/dev/null 2>&1
echo "status: deploy disk_after=$(df -P / | awk 'NR==2{print $5}') release=$S8 health=ok"
echo "deploy: DONE main@$S8 live; rollback images nabdah-*:rollback-$TS; backup $(basename $DUMP)"
echo "## deploy-main done"
