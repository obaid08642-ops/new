#!/bin/bash
# READ-ONLY (review session, 2026-10-16; owner approved "مهمة قراءة البيانات"). Exports the reference catalogues for the
# data audit: medicines, insurance companies/networks/coverage rules, lab, radiology and nursing services. No patient
# or provider-account collection is read. Writes nothing to the database.
# Prints the name and count of every collection (names only), then the allowlisted collections as gzip+base64 between
# markers. The whole output goes only into the encrypted report; the public log shows only "catalog:" lines.
# The credentials stay inside the MongoDB container in a mode-600 config file that is deleted at the end.
set +e
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
DK="sudo -n docker"
C=nabdah-mongodb
DBN=$(sudo -n grep -E '^DB_NAME=' $D/.env.production | cut -d= -f2); DBN=${DBN:-nabd_nestjs}
ALLOW='^(medicines|.*categor.*|insurance_companies|insurance_networks|insurance_coverage_rules|insurance_classes|insurance_plans|lab_services|lab_tests|lab_packages|radiology_services|nursing_services|home_care_services|specialties|service_packages|packages)$'

$DK exec $C sh -c 'umask 077; printf "password: %s\n" "$MONGO_INITDB_ROOT_PASSWORD" > /tmp/.ops-export.yml'
ARGS="--quiet --authenticationDatabase admin -d $DBN"
USERFLAG='-u "$MONGO_INITDB_ROOT_USERNAME" --config /tmp/.ops-export.yml'

echo "catalog: database $DBN"
# the credentials are read from the container's environment inside mongosh, never put on a command line
$DK exec -e OPS_DB=$DBN $C mongosh --nodb --quiet --eval '
  const e = process.env, u = encodeURIComponent(e.MONGO_INITDB_ROOT_USERNAME), p = encodeURIComponent(e.MONGO_INITDB_ROOT_PASSWORD);
  const d = connect("mongodb://" + u + ":" + p + "@127.0.0.1:27017/" + e.OPS_DB + "?authSource=admin&directConnection=true");
  d.getCollectionNames().sort().forEach(n => print("collection " + n + " " + d.getCollection(n).estimatedDocumentCount()));' 2>/dev/null > /tmp/ops-cols.txt
cat /tmp/ops-cols.txt
LIST=$(awk '{print $2}' /tmp/ops-cols.txt | grep -E "$ALLOW")
echo "catalog: exporting $(echo $LIST | wc -w) collections: $(echo $LIST | tr '\n' ' ')"

$DK exec $C sh -c 'rm -rf /tmp/ops-export && mkdir -m 700 /tmp/ops-export'
HAS_EXPORT=$($DK exec $C sh -c 'command -v mongoexport' >/dev/null 2>&1 && echo yes || echo no)
echo "catalog: mongoexport in the image: $HAS_EXPORT"
for n in $LIST; do
  if [ "$HAS_EXPORT" = yes ]; then
    $DK exec $C sh -c "mongoexport $ARGS $USERFLAG -c $n --out /tmp/ops-export/$n.jsonl" >/dev/null 2>&1
  else
    $DK exec -e OPS_DB=$DBN -e OPS_COL=$n $C mongosh --nodb --quiet --eval '
      const e = process.env, u = encodeURIComponent(e.MONGO_INITDB_ROOT_USERNAME), p = encodeURIComponent(e.MONGO_INITDB_ROOT_PASSWORD);
      const d = connect("mongodb://" + u + ":" + p + "@127.0.0.1:27017/" + e.OPS_DB + "?authSource=admin&directConnection=true");
      const fs = require("fs"); const out = fs.openSync("/tmp/ops-export/" + e.OPS_COL + ".jsonl", "w");
      d.getCollection(e.OPS_COL).find().forEach(x => fs.writeSync(out, EJSON.stringify(x, { relaxed: true }) + "\n")); fs.closeSync(out);' >/dev/null 2>&1
  fi
  echo "catalog: $n $($DK exec $C sh -c "wc -l < /tmp/ops-export/$n.jsonl" 2>/dev/null) rows"
done
echo "-----BEGIN CATALOG TGZ-----"
$DK exec $C sh -c 'cd /tmp/ops-export && tar czf - .' | base64 -w 0
echo
echo "-----END CATALOG TGZ-----"
$DK exec $C sh -c 'rm -rf /tmp/ops-export /tmp/.ops-export.yml'
rm -f /tmp/ops-cols.txt
echo "catalog: done"
