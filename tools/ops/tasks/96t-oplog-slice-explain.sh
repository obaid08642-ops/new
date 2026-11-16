#!/bin/bash
# Run 133 (2026-11-16): the worker read local.oplog.rs with a COLLSCAN for 111-116 s at 16:10-16:15 UTC, the minute of the */10 oplog slice (deploy/scripts/oplog-backup.sh: mongodump of
# local.oplog.rs with a ts range). A ts-bounded oplog scan shows as COLLSCAN too, so the label alone proves nothing: what matters is docsExamined. READ-ONLY: explains (executionStats, nothing
# is run for its documents) the slice query for the LAST WINDOW_MIN minutes and prints counters only: stage, docs examined, keys, ms, oplog size and span. No filter value, no document.
set -u
WINDOW_MIN=${WINDOW_MIN:-10}
DK="sudo -n docker"
CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
DB=${DB_NAME:-nabd_nestjs}
say() { echo "status: oplog-slice-explain: $*"; }
echo "## oplog-slice-explain (read-only)"
JS='const o=db.getSiblingDB("local").oplog.rs;const win='"$WINDOW_MIN"'*60;const head=o.find({},{ts:1}).sort({$natural:-1}).limit(1).next().ts;const from=new Timestamp(head.getHighBits()-win,0);
const q={ts:{$gt:from,$lte:head},op:{$ne:"n"},$or:[{ns:{$regex:"^'"$DB"'\\."}},{ns:"admin.$cmd","o.applyOps":{$exists:true}}]};
const e=o.find(q).explain("executionStats").executionStats;
const st=db.getSiblingDB("local").oplog.rs.stats();
const first=o.find({},{ts:1}).sort({$natural:1}).limit(1).next().ts;
print("window_min="+'"$WINDOW_MIN"'+" returned="+e.nReturned+" docs_examined="+e.totalDocsExamined+" keys="+e.totalKeysExamined+" ms="+e.executionTimeMillis);
print("oplog_size_mb="+Math.round(st.size/1048576)+" count="+st.count+" span_h="+Math.round((head.getHighBits()-first.getHighBits())/3600));'
$DK exec $CT sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$JS" 2>&1 < /dev/null | grep -E '^(window_min|oplog_size)' | while IFS= read -r l; do say "$l"; done
say "reading: docs_examined close to returned = the range is bounded (the scan is cheap, a long run is memory/disk starvation); docs_examined near count = the bound is lost (fix the query)"
say "done (read-only)"
