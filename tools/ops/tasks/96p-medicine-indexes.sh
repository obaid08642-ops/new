#!/bin/bash
# Do the two covering indexes from #2597 exist on the medicines collection, and what is the size of the public medicine set? READ-ONLY, `status:` lines only; listIndexes and a count, nothing is written.
# For ops run 114 (after the deploy of the P0 mongod OOM fix): public_manufacturer_covering_v1 and public_form_covering_v1 must be there, and the filters query must use them.
set -u
DK="sudo -n docker"
CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
# The database is the one the backend uses: DB_NAME in .env.production, default nabd_nestjs (what 58/60/62/63/64 do). Run 114 queried a database called `nabd`, which does not
# exist on the server, and printed MISSING / "indexes on medicines: 0" / collection-scan: a false alarm from the wrong database, not a statement about the real collection.
DBN=${OPS_MONGO_DB:-$(sudo -n grep -E '^DB_NAME=' "$D/.env.production" 2>/dev/null | tail -1 | cut -d= -f2 | tr -d "\"' ")}
DBN=${DBN:-nabd_nestjs}
say() { echo "status: medicine-indexes: $*"; }
say "database: $DBN"
echo "## medicine-indexes (read-only)"
q() { $DK exec "$CT" sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin "$2" --eval "$1"' sh "$1" "$DBN" 2>/dev/null < /dev/null; }
OUT=$(q 'db.medicines.getIndexes().forEach(i => print("idx " + i.name))' | grep '^idx ' | sed 's/^idx //')
for n in public_manufacturer_covering_v1 public_form_covering_v1; do
  if echo "$OUT" | grep -qx "$n"; then say "$n: present"; else say "$n: MISSING (the backend builds it at start; a missing index after the deploy means the build failed or the old image still runs)"; fi
done
say "indexes on medicines: $(echo "$OUT" | grep -c .)"
PLAN=$(q 'const e=db.medicines.explain("queryPlanner").distinct("manufacturer",{is_deleted:{$ne:true},public_eligibility:true,medical_review_status:"approved",manufacturer:{$ne:null}}); const s=JSON.stringify(e.queryPlanner.winningPlan); print((s.includes("DISTINCT_SCAN")||s.includes("IXSCAN")?"index":"collection-scan")+" "+(s.match(/\"indexName\":\"([^\"]+)\"/)||["",""])[1])' | tail -1)
say "distinct(manufacturer) plan: ${PLAN:-unknown}"
exit 0
