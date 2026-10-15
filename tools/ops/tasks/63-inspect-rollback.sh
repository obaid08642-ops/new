#!/bin/bash
# READ-ONLY (reviewer, 2026-10-15). After deploy run 38672346219: 60-deploy-main failed at the migration
# 2026-09-catalog-json-to-db (E11000 on labservices.id_1) and the public log stopped at "evidence: -- nabdah-patient-web"
# when the workflow stopped polling at 60 minutes. This checks, without changing anything:
#   1. whether the detached deploy task is still running (and where its log ends); if it is, exit 99, which stops the
#      whole server-ops run before the next task (reviewer, 2026-10-15)
#   2. containers: health, image of each app service vs the rollback-<ts> tags, no worker/meilisearch
#   3. deploy files and env NAMES vs the snapshot the deploy took; files that did not exist before are absent
#   4. nginx -t, api and site answers
#   5. the database: what the failed migration left (counts only) and how the catalog JSON items match production
#      docs (by test_code / short_code / id), with the release's own seed JSON
# Prints names, counts, hashes and states only; never a value from the env file.
set -u
TS=${OPS_ROLLBACK_TS:-20261015T024406Z}
PRE=${OPS_PRE_SHA:-8c8c08ac}
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
MIG=${OPS_MIGRATIONS_IMAGE:-nabdah-migrations:$PRE}
DK="sudo -n docker"
SNAP=$B/deploy-files-pre-$PRE-$TS.tgz
LOG=${OPS_DEPLOY_LOG:-$HOME/ops-60-deploy-main.log}
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
echo "## inspect-rollback $PRE $TS"

# ---------------------------------------------------------------- 1. the deploy task
P=$(pgrep -f 'ops-60-deploy-main.sh' | tr '\n' ' ')
echo "x0: deploy task processes: ${P:-none}"
[ -n "$P" ] && ps -o pid,etime,cmd --ppid "$(echo $P | cut -d' ' -f1)" 2>/dev/null | cut -c1-160 | sed 's/^/x0:   child /'
pgrep -af 'docker logs' | cut -c1-160 | sed 's/^/x0:   running: /'
if [ -f "$LOG" ]; then
  echo "x0: deploy log: $(wc -l < "$LOG") lines, last change $(date -u -r "$LOG" +%FT%TZ), exit line: $(grep -m1 '^ops-exit=' "$LOG" || echo none)"
  grep -E '^(deploy|migrate): ' "$LOG" | grep -vE '^migrate:   +(at |\{|\}|[a-zA-Z_]+:)' | cut -c1-220 | tail -12 | sed 's/^/x0:   log /'
else
  echo "x0: deploy log $LOG not found"
fi

# ---------------------------------------------------------------- 2. containers
for c in nabdah-backend nabdah-admin-web nabdah-patient-web nabdah-nginx nabdah-mongodb nabdah-redis nabdah-livekit nabdah-worker nabdah-meilisearch; do
  echo "x0: $c $($DK inspect -f '{{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}} started={{.State.StartedAt}} image={{.Config.Image}}' $c 2>/dev/null || echo absent)"
done
for s in backend admin-web patient-web; do
  run=$($DK inspect -f '{{.Image}}' nabdah-$s 2>/dev/null); rb=$($DK image inspect -f '{{.Id}}' nabdah-$s:rollback-$TS 2>/dev/null)
  if [ -z "$rb" ]; then echo "x0: $s: no image nabdah-$s:rollback-$TS"
  elif [ "$run" = "$rb" ]; then echo "x0: $s runs its rollback-$TS image"
  else echo "x0: $s runs ${run:7:12}, rollback-$TS is ${rb:7:12} (different)"; fi
done
echo "x0: docker logs of patient-web answers in 20 s: $(timeout 20 $DK logs --tail 1 nabdah-patient-web >/dev/null 2>&1; r=$?; [ $r = 124 ] && echo 'NO (hangs)' || echo "yes (exit $r)")"

# ---------------------------------------------------------------- 3. files and env names
if sudo -n test -f "$SNAP"; then
  sudo -n tar -xzf "$SNAP" -C "$T" 2>/dev/null
  for f in $(sudo -n tar -tzf "$SNAP" | grep -v '/$'); do
    a=$(sudo -n sha256sum "$T/$f" | cut -c1-12); b=$(sudo -n sha256sum "$D/$f" 2>/dev/null | cut -c1-12)
    [ "$a" = "$b" ] && echo "x0: file $f = snapshot" || echo "x0: file $f DIFFERS from the snapshot (now ${b:-absent})"
  done
  for f in docker-compose.release.yml nginx/snippets/api-microcache.conf; do
    sudo -n tar -tzf "$SNAP" | grep -qx "$f" || { sudo -n test -e "$D/$f" && echo "x0: $f exists but did not before the deploy" || echo "x0: $f absent, as before the deploy"; }
  done
  sudo -n cut -d= -f1 "$T/.env.production" | grep -E '^[A-Z_][A-Z0-9_]*$' | sort -u > "$T/n1"
  sudo -n cut -d= -f1 "$D/.env.production" | grep -E '^[A-Z_][A-Z0-9_]*$' | sort -u > "$T/n2"
  echo "x0: env names only now: $(comm -13 "$T/n1" "$T/n2" | tr '\n' ' ')"
  echo "x0: env names only in the snapshot: $(comm -23 "$T/n1" "$T/n2" | tr '\n' ' ')"
  sudo -n rm -rf "$T"/.env.production "$T"/docker-compose* "$T"/nginx
else
  echo "x0: snapshot $SNAP not found"
fi

# ---------------------------------------------------------------- 4. answers
$DK exec nabdah-nginx nginx -t >/dev/null 2>&1 && echo "x0: nginx -t ok" || echo "x0: nginx -t FAILS"
for h in 'api.nabd.plus /api/v1/health/liveness' 'nabd.plus /ar' 'admin.nabd.plus /login'; do
  set -- $h; echo "x0: https://$1$2 -> $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H "Host: $1" "https://127.0.0.1$2")"
done

# ---------------------------------------------------------------- 5. database
DBN=$(sudo -n grep -E '^DB_NAME=' $D/.env.production | cut -d= -f2); DBN=${DBN:-nabd_nestjs}
$DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin '"$DBN"' --eval "
const c = (n, q) => db.getCollection(n).countDocuments(q || {});
print(\"x0: db labservices total=\" + c(\"labservices\") + \" with_test_code=\" + c(\"labservices\", {test_code: {\$exists: true}}) + \" with_short_code=\" + c(\"labservices\", {short_code: {\$exists: true}}) + \" test_code_eq_short_code=\" + c(\"labservices\", {\$expr: {\$eq: [\"\$test_code\", \"\$short_code\"]}}));
print(\"x0: db radiologyservices total=\" + c(\"radiologyservices\") + \" with_short_code=\" + c(\"radiologyservices\", {short_code: {\$exists: true}}) + \"; nursing_catalog=\" + c(\"nursing_catalog\") + \"; insurancecompanies json-migration=\" + c(\"insurancecompanies\", {provenance: \"json-migration\"}) + \"; insurance_networks json-migration=\" + c(\"insurance_networks\", {provenance: \"json-migration\"}) + \"; feature_flags=\" + c(\"feature_flags\") + \"; medicines=\" + c(\"medicines\"));
for (const n of [\"labservices\", \"radiologyservices\", \"nursing_catalog\"]) print(\"x0: db \" + n + \" unique indexes: \" + db.getCollection(n).getIndexes().filter(i => i.unique).map(i => i.name).join(\",\"));
"' 2>&1 | grep '^x0:' | cut -c1-300

# how the seed JSON items match production docs (the release's seed files, read in its migrations image; read-only)
if $DK image inspect "$MIG" >/dev/null 2>&1; then
  NET=$($DK inspect nabdah-mongodb -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
  EF=$(mktemp); chmod 600 $EF
  U=$($DK exec nabdah-mongodb printenv MONGO_INITDB_ROOT_USERNAME); PW=$($DK exec nabdah-mongodb printenv MONGO_INITDB_ROOT_PASSWORD)
  enc() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""),end="")' "$1"; }
  printf 'MONGODB_URI=mongodb://%s:%s@mongodb:27017/%s?authSource=admin&directConnection=true\n' "$(enc "$U")" "$(enc "$PW")" "$DBN" > $EF
  unset U PW
  timeout 180 $DK run --rm -i --network "$NET" --env-file $EF --memory 512m --entrypoint node "$MIG" - <<'JS' 2>&1 | grep '^x0:' | cut -c1-300
const mongoose = require('/app/node_modules/mongoose');
const D = '/app/src/modules/catalogs/seed-data/';
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'item';
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  for (const [file, coll, codeField] of [['labs.json', 'labservices', 'test_code'], ['radiology.json', 'radiologyservices', 'short_code']]) {
    const items = require(D + file);
    const t = { json: items.length, json_with_id: 0, by_code: 0, by_short_code: 0, by_id_only: 0, none: 0 };
    for (const x of items) {
      const code = x.short_code || slug(x.name_en);
      if (x.id) t.json_with_id++;
      const c = db.collection(coll);
      if (await c.findOne({ [codeField]: code })) t.by_code++;
      else if (await c.findOne({ short_code: code })) t.by_short_code++;
      else if (x.id && (await c.findOne({ id: x.id }))) t.by_id_only++;
      else t.none++;
    }
    console.log('x0: seed ' + file + ' vs ' + coll + ': ' + JSON.stringify(t));
  }
  await mongoose.disconnect();
})().catch((e) => { console.log('x0: seed check failed: ' + String(e.message).slice(0, 160)); process.exit(1); });
JS
  rm -f $EF
else
  echo "x0: $MIG not on the host; seed check skipped"
fi
if [ -n "$P" ]; then
  echo "x0: STOP an older deploy task (60-deploy-main) is still running on the server: the run stops here, before 59 (exit 99)"
  exit 99
fi
echo "x0: no older deploy task running; the run may continue"
echo "## inspect-rollback done"
