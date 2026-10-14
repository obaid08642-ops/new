#!/bin/bash
# ops-detach: runs detached on the server (see server-inspect.yml); the workflow polls its log.
# READ-ONLY (build session, 2026-10-14). Dry-run of every migration in main at the release SHA against the production
# database, before the deploy of main (docs/deploy/DEPLOY_BRIEF_FOR_AGENT.md §3.5: dry-run first, the owner reads the
# counts, applies only with the owner's OK). No script gets --apply or --copy, so none writes.
# Runs in the release's migrations image (nabdah-migrations:<sha8>, built on the runner) on the compose internal
# network. The database credentials are read from the MongoDB container into a mode-600 env file that is deleted at
# the end; they are never printed. Script output is cut to its last lines with e-mail addresses and phone numbers masked.
set +e
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
SHA=${OPS_RELEASE_SHA:-3ca66ab1291e6cc9be813b77ffb888a7443a8e5f}
S8=${SHA:0:8}
REL=${OPS_RELEASE_DIR:-/opt/nabdah/releases}/$S8
DK="sudo -n docker"
IMG=nabdah-migrations:$S8
echo "## migrations-dryrun $S8"
mask() { sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/<email>/g; s/\+?[0-9][0-9 ()-]{8,}[0-9]/<number>/g' | grep -viE 'password|secret|token' | cut -c1-300; }

[ -f "$REL/SHA256SUMS" ] && (cd "$REL" && sha256sum -c --quiet SHA256SUMS) || { echo "migrations: ABORT release $S8 missing or checksum mismatch"; exit 1; }
$DK image inspect $IMG >/dev/null 2>&1 || gunzip -c "$REL/images.tar.gz" | $DK load -q >/dev/null 2>&1
$DK image inspect $IMG >/dev/null 2>&1 || { echo "migrations: ABORT $IMG not loaded"; exit 1; }
NET=$($DK inspect nabdah-mongodb -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
DBN=$(sudo -n grep -E '^DB_NAME=' $D/.env.production | cut -d= -f2); DBN=${DBN:-nabd_nestjs}
EF=$(mktemp); chmod 600 $EF
U=$($DK exec nabdah-mongodb printenv MONGO_INITDB_ROOT_USERNAME); P=$($DK exec nabdah-mongodb printenv MONGO_INITDB_ROOT_PASSWORD)
UE=$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$U" 2>/dev/null || python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""),end="")' "$U")
PE=$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$P" 2>/dev/null || python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""),end="")' "$P")
printf 'MONGODB_URI=mongodb://%s:%s@mongodb:27017/?authSource=admin&directConnection=true\nMONGO_URL=mongodb://%s:%s@mongodb:27017/?authSource=admin&directConnection=true\nDB_NAME=%s\n' "$UE" "$PE" "$UE" "$PE" "$DBN" > $EF
unset U P UE PE
echo "migrations: database $DBN, network $NET, image $IMG"

# the order the deploy brief gives first (link before unify), then the rest by name
ORDER="2026-09-link-provider-accounts 2026-09-unify-provider-passwords 2026-09-strip-facility-ratings 2026-09-purge-demo 2026-09-backfill-row-ids 2026-09-sync-profile-type-geo"
ALL=$($DK run --rm --entrypoint sh $IMG -c 'ls scripts/migrations' | grep -E '^2026-.*\.ts$' | sed 's/\.ts$//' | sort)
LIST="$ORDER $(for m in $ALL; do echo " $ORDER " | grep -q " $m " || echo $m; done)"
for m in $LIST; do
  echo; echo "-- $m (dry-run)"
  timeout 300 $DK run --rm --network "$NET" --env-file $EF --memory 512m $IMG \
    npx ts-node --transpile-only "scripts/migrations/$m.ts" 2>&1 | mask | tail -15
  echo "   exit=${PIPESTATUS[0]}"
done
echo; echo "-- index scripts present in main (applied state)"
$DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin '"$DBN"' --eval "
for (const c of [\"pharmacyorders\",\"pharmacy_orders\",\"pharmacyproducts\",\"payments\",\"payment_evidences\"]) { if (db.getCollectionNames().includes(c)) print(c, JSON.stringify(db.getCollection(c).getIndexes().map(i=>i.name))) }
"' 2>&1 | cut -c1-400
rm -f $EF
echo; echo "## migrations-dryrun done"
