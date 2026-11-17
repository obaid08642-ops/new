#!/bin/bash
# Launch facts, READ-ONLY, counts and NAMES only (no value, no id, no document, no secret). Lead order 2026-11-16 22:30, item 4:
#   1 scfhs      is the SCFHS API configured: which of SCFHS_API_KEY / SCFHS_VERIFY_URL / SCFHS_RECHECK_GRACE_DAYS exist in the backend and worker containers (the NAMES present, never a value)
#   2 licences   providers with no licence expiry date (`license_expiry_date`), per provider type, next to the total per type
#   3 migration  do the indexes of migration 20260827 (backend/scripts/migrations/20260827-pharmacy-expiry-indexes.js) exist: the two UNIQUE ones (domain_outbox, recipients) and the three scan indexes
#   4 outbox     domain_outbox rows per state (and the oldest pending age in minutes)
set -u
DK="sudo -n docker"
CT=${OPS_MONGO_CONTAINER:-nabdah-mongodb}
BE=${OPS_BACKEND_CONTAINER:-nabdah-backend}
WK=${OPS_WORKER_CONTAINER:-nabdah-worker}
say() { echo "status: launch-facts: $*"; }
echo "## launch-facts (read-only)"

# 1 SCFHS: names of the variables that are SET (value never read into the output)
for c in "$BE" "$WK"; do
  if [ "$($DK inspect -f '{{.State.Status}}' "$c" 2>/dev/null)" = running ]; then
    set_names=$($DK exec "$c" sh -c 'for n in SCFHS_API_KEY SCFHS_VERIFY_URL SCFHS_RECHECK_GRACE_DAYS; do eval "v=\${$n:-}"; [ -n "$v" ] && printf "%s " "$n"; done' 2>/dev/null)
    say "scfhs: $c has set: ${set_names:-(none of SCFHS_API_KEY, SCFHS_VERIFY_URL, SCFHS_RECHECK_GRACE_DAYS)}"
  else
    say "scfhs: $c is not running, skipped"
  fi
done

q() { $DK exec "$CT" sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null < /dev/null; }
APPDB=${DB_NAME:-$(q 'print(db.adminCommand({listDatabases:1}).databases.filter(d=>!["admin","local","config"].includes(d.name)).sort((a,b)=>b.sizeOnDisk-a.sizeOnDisk).map(d=>d.name)[0])' | tail -1 | tr -d "'\" \r")}
case "$APPDB" in ''|*[!A-Za-z0-9_-]*) say "REFUSE: cannot tell the application database name; nothing more was run"; exit 0;; esac
say "database: $APPDB"

# 2 providers without a licence date, per type (counts only)
q 'const d=db.getSiblingDB("'"$APPDB"'");const m={};for(const r of d.providerprofiles.aggregate([{$group:{_id:{t:"$type",none:{$cond:[{$ifNull:["$license_expiry_date",false]},0,1]}},n:{$sum:1}}}],{allowDiskUse:true}).toArray()){const k=String(r._id.t);m[k]=m[k]||{total:0,no_licence_date:0};m[k].total+=r.n;if(r._id.none)m[k].no_licence_date+=r.n;}for(const k of Object.keys(m).sort())print("LIC "+k+" total="+m[k].total+" no_licence_date="+m[k].no_licence_date);' | grep '^LIC ' | while IFS= read -r l; do say "licences: ${l#LIC }"; done

# 3 the indexes of migration 20260827 (names present or MISSING)
q 'const d=db.getSiblingDB("'"$APPDB"'");const want={domain_outbox:["domain_outbox_pharmacy_idempotency_unique"],pharmacy_broadcast_recipients:["pharmacy_broadcast_recipient_unique"],pharmacy_offers:["pharmacy_offers_due_expiry_scan"],pharmacy_broadcasts:["pharmacy_broadcasts_due_expiry_scan"]};for(const c of Object.keys(want)){let have=[];try{have=d.getCollection(c).getIndexes();}catch(e){}for(const n of want[c]){const ix=have.find(i=>i.name===n);print("IDX "+c+"."+n+" "+(ix?("present unique="+(ix.unique===true)):"MISSING"));}}' | grep '^IDX ' | while IFS= read -r l; do say "migration-20260827: ${l#IDX }"; done

# 4 domain_outbox rows per state, oldest pending
q 'const d=db.getSiblingDB("'"$APPDB"'");const o=d.domain_outbox;for(const r of o.aggregate([{$group:{_id:"$state",n:{$sum:1}}},{$sort:{n:-1}}],{allowDiskUse:true,maxTimeMS:60000}).toArray())print("OUT state="+String(r._id)+" rows="+r.n);const p=o.find({state:"pending"},{created_at:1,_id:0}).sort({created_at:1}).limit(1).toArray()[0];print("OUT oldest_pending_min="+(p&&p.created_at?Math.round((Date.now()-new Date(p.created_at).getTime())/60000):"none"));' | grep '^OUT ' | while IFS= read -r l; do say "domain_outbox: ${l#OUT }"; done
say "done (read-only; nothing was written)"
