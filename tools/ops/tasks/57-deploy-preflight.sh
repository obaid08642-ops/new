#!/bin/bash
# READ-ONLY (build session, 2026-10-14). Facts the deploy of main needs (build brief §5.3,
# docs/deploy/DEPLOY_BRIEF_FOR_AGENT.md §2): how the server's deploy files differ from main at the pinned commit,
# whether main's nginx config passes `nginx -t` against the server's certs, whether main's compose file validates
# with the server's env file, the MongoDB replica set and database sizes, which env names main expects that the
# server lacks, the backup cron, and how the running images were built.
# Changes nothing on the server: it writes only under a /tmp directory it removes at the end, and the nginx test runs
# in a throwaway container. Secret VALUES are never printed: env files are reduced to names; livekit.yaml, coturn
# config and .env files are never diffed.
set +e
SHA=3ca66ab1291e6cc9be813b77ffb888a7443a8e5f
sec() { echo; echo "## $1"; }
D=/opt/nabdah/deploy
W=$(mktemp -d /tmp/preflight.XXXXXX)
DK="sudo -n docker"
nosecret() { grep -viE 'password|passwd|secret|token|api_key|apikey|private'; }

sec "fetch main@${SHA:0:8} (deploy/ and backend migrations only)"
curl -sfL --max-time 300 "https://codeload.github.com/obaid08642-ops/new/tar.gz/$SHA" -o $W/src.tgz
echo "download exit=$? size=$(stat -c %s $W/src.tgz 2>/dev/null)"
tar -xzf $W/src.tgz -C $W --strip-components=1 --wildcards "*/deploy/*" "*/backend/scripts/migrations/*" "*/backend/package.json" 2>&1 | tail -3
rm -f $W/src.tgz
M=$W/deploy
[ -f $M/docker-compose.production.yml ] || { echo "preflight: ABORT main deploy/ not extracted"; rm -rf $W; exit 1; }

sec "files: server deploy/ vs main deploy/ (names only)"
(cd $D && sudo -n find . -path ./certs -prune -o -type f -print | sort) > $W/server.lst
(cd $M && find . -type f | sort) > $W/main.lst
echo "-- only on server:"; comm -23 $W/server.lst $W/main.lst
echo "-- only in main:"; comm -13 $W/server.lst $W/main.lst
echo "-- in both, different:"
for f in $(comm -12 $W/server.lst $W/main.lst); do sudo -n cmp -s "$D/$f" "$M/$f" || echo "   $f"; done

sec "diff: docker-compose.production.yml (server -> main)"
sudo -n diff -u $D/docker-compose.production.yml $M/docker-compose.production.yml | nosecret | head -250
for f in nginx/nginx.conf nginx/conf.d/nabd.plus.conf nginx/conf.d/nabd-web.conf nginx/conf.d/mcp.conf nginx/conf.d/00-bootstrap.conf redis/redis.conf mongo/mongod.conf docker/Dockerfile.backend docker/Dockerfile.patient-web docker/Dockerfile.admin-web; do
  sec "diff: $f (server -> main)"
  sudo -n test -f $D/$f || echo "(not on server)"
  [ -f $M/$f ] || echo "(not in main)"
  sudo -n diff -u $D/$f $M/$f 2>/dev/null | nosecret | head -160
done

sec "certs layout (names only)"
sudo -n find $D/certs -maxdepth 4 \( -name '*.pem' -o -type d \) 2>/dev/null | sed "s#$D/##" | grep -v archive | head -40
sec "mongo keyfile (owner/mode/size only)"; sudo -n stat -c '%U:%G %a %s bytes %n' $D/mongo/mongo-keyfile 2>&1

sec "nginx -t: main's nginx files + the server's certs (throwaway container)"
mkdir -p $W/ng && cp -r $M/nginx/. $W/ng/ && rm -f $W/ng/conf.d/staging.conf
for f in $(comm -23 <(sudo -n ls $D/nginx/conf.d | grep -E '\.conf$') <(ls $M/nginx/conf.d | grep -E '\.conf$')); do
  sudo -n cat $D/nginx/conf.d/$f > $W/ng/conf.d/$f; echo "kept server-only vhost: $f"
done
NETS=$($DK inspect nabdah-nginx -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')
echo "nginx networks now: $NETS"
$DK run --rm --network "$(echo $NETS | awk '{print $1}')" --add-host patient-web:127.0.0.1 --add-host worker:127.0.0.1 \
  -v $W/ng/nginx.conf:/etc/nginx/nginx.conf:ro -v $W/ng/conf.d:/etc/nginx/conf.d:ro -v $W/ng/snippets:/etc/nginx/snippets:ro \
  -v $D/certs/live:/etc/letsencrypt:ro nginx:1.27-alpine nginx -t 2>&1 | tail -8

sec "compose config: main's compose file with the server's env file (services and warnings; no values)"
$DK compose -f $M/docker-compose.production.yml --project-directory $D --env-file $D/.env.production config --services 2>&1 | head -30
$DK compose -f $M/docker-compose.production.yml --project-directory $D --env-file $D/.env.production config -q 2>&1 | nosecret | head -20
echo "config -q exit=${PIPESTATUS[0]}"

sec "env NAMES main's .env.production.example lists that the server lacks"
grep -oE '^[A-Z_][A-Z0-9_]*=' $M/.env.production.example | tr -d = | sort -u > $W/want
sudo -n grep -oE '^[A-Z_][A-Z0-9_]*=' $D/.env.production | tr -d = | sort -u > $W/have
comm -23 $W/want $W/have | tr '\n' ' '; echo
echo "-- forbidden names present (must be none):"
for n in DISABLE_RATE_LIMIT LOAD_TEST_BYPASS_TOKEN ALLOW_TEST_SEED USE_MEMORY_MONGO SEED_DEMO_DATA MOYASAR_API_BASE; do sudo -n grep -q "^$n=" $D/.env.production && echo "   $n"; done
echo "-- names holding a placeholder value:"; sudo -n grep -E '=(pending_real_key|changeme|__[A-Z_]+__)$' $D/.env.production | cut -d= -f1

sec "MongoDB: replica set, databases and sizes"
$DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "
try { const s=rs.status(); print(\"rs:\", s.set, \"members:\", s.members.length, s.members.map(m=>m.stateStr).join(\",\")) } catch(e) { print(\"rs: none (\"+e.codeName+\")\") }
db.adminCommand({listDatabases:1}).databases.forEach(d=>print(\"db:\", d.name, Math.round(d.sizeOnDisk/1048576)+\" MB\"))
"' 2>&1 | head -30

sec "migrations in main vs the server's backend source"
ls $W/backend/scripts/migrations 2>/dev/null | sort > $W/mig.main
sudo -n ls /opt/nabdah/nabdah-backend/scripts/migrations 2>/dev/null | sort > $W/mig.server
echo "-- only in main:"; comm -23 $W/mig.main $W/mig.server
echo "-- count main=$(wc -l < $W/mig.main) server=$(wc -l < $W/mig.server)"

sec "backup cron"; sudo -n crontab -l 2>&1 | grep -v '^#'; sudo -n ls -l /etc/cron.d 2>&1 | tail -5

sec "how the running images were built"
for c in nabdah-patient-web nabdah-backend nabdah-admin-web; do
  echo "-- $c"
  $DK image inspect "$($DK inspect -f '{{.Image}}' $c)" -f 'created={{.Created}} tags={{.RepoTags}} labels={{json .Config.Labels}} cmd={{json .Config.Cmd}} workdir={{.Config.WorkingDir}}' 2>&1 | cut -c1-400
done
$DK images --format '{{.Repository}}:{{.Tag}} {{.Size}} {{.CreatedSince}}' | head -30

sec "source dirs: kind and size"
for d in /opt/nabdah/nabdah-backend /opt/nabdah/Napd-admin /opt/nabdah/Napd-admin/web-admin /opt/nabdah/patient-web /opt/nabdah/nabdah-patient-web; do
  echo "$d size=$(sudo -n du -sh $d 2>/dev/null | cut -f1) git=$(sudo -n test -d $d/.git && echo yes || echo no) link=$(readlink $d)"
done
sec "room for the release"; df -h / | tail -1; $DK system df 2>&1 | head -6

rm -rf $W
echo; echo "## deploy-preflight done"
