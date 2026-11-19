#!/bin/bash
# Which indexes of the `medicines` collection are USED? READ-ONLY, `status:` lines, names and counters only: no document, no value. Lead queue 2026-11-17, item 7: the old public_* indexes
# (public_price_asc, public_price_desc, public_newest, public_most_ordered) were replaced by the *_v2 ones (#2715, #2738); this task is the evidence for dropping them: `$indexStats` says how many times
# each index was used since mongod last started (`since`), and the size of each index. A candidate is an index whose `ops` is 0 (or tiny) over a window that included normal traffic.
# Reading: `ops` resets when mongod restarts (it has been restarting often until the memory fixes: if `since` is recent the numbers are only that short window; run it again after a few days).
# Nothing is written, no index is dropped by this task (a drop is a separate, owner-approved PR/task).
set -u
DK="sudo -n docker"
CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
DB=${DB_NAME:-nabd_nestjs}
COLL=${COLLECTION:-medicines}
case "$COLL" in *[!A-Za-z0-9_]*|'') COLL=medicines;; esac
case "$DB" in *[!A-Za-z0-9_-]*|'') DB=nabd_nestjs;; esac
say() { echo "status: index-usage: $*"; }
echo "## index-usage (read-only)"

q() { $DK exec "$CT" sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null < /dev/null; }
JS='const d=db.getSiblingDB("'"$DB"'");const c=d.getCollection("'"$COLL"'");const st=c.aggregate([{$indexStats:{}}]).toArray();let sizes={};try{sizes=c.stats().indexSizes||{};}catch(e){}
for(const s of st.sort((a,b)=>a.accesses.ops-b.accesses.ops)){print("IDX name="+s.name+" ops="+s.accesses.ops+" since="+new Date(s.accesses.since).toISOString()+" size_mb="+Math.round((sizes[s.name]||0)/1048576*10)/10);}
print("TOT indexes="+st.length+" total_index_mb="+Math.round(Object.values(sizes).reduce((a,b)=>a+b,0)/1048576));'
out=$(q "$JS")
printf '%s\n' "$out" | grep '^IDX ' | while IFS= read -r l; do
  n=$(printf '%s' "$l" | sed -E 's/^IDX name=([^ ]+) .*/\1/')
  tag=""
  case "$n" in public_price_asc|public_price_desc|public_newest|public_most_ordered) tag=" [OLD: replaced by the *_v2 index, drop candidate when ops stays 0 over a normal-traffic window]";; esac
  say "${l#IDX }$tag"
done
printf '%s\n' "$out" | grep '^TOT ' | while IFS= read -r l; do say "${l#TOT }"; done
say "done (read-only; nothing was dropped)"
