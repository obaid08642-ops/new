#!/bin/bash
# Removes the old Meilisearch data dir that run 78 (98f-meili-fresh) renamed into the backups dir (2.7 GB; disk at 90% after run 80).
# Guarded: only when the live engine holds as many documents as Mongo search_index and has not restarted since its fresh start; only paths
# named meili-data-old-* or meili-data-fresh-* under the backups dir. APPLY=yes removes; otherwise a dry run. Names and sizes only.
set -u
APPLY=${APPLY:-yes}
DK="sudo -n docker"; B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}; IDX=nabd_search
say() { echo "status: meili-old: $*"; }
JS='const u=process.env.MEILI_URL,k=process.env.MEILI_MASTER_KEY;fetch(u+"/indexes/'$IDX'/stats",{headers:{Authorization:"Bearer "+k}}).then(r=>r.json()).then(j=>console.log(j.numberOfDocuments??"none")).catch(()=>console.log("down"))'
DOCS=$($DK exec nabdah-backend node -e "$JS" 2>/dev/null | tr -d '\r' | tail -1)
MQ="print(db.getSiblingDB(process.env.DB_NAME||'nabd_nestjs').search_index.countDocuments({}))"
WANTED=$($DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$MQ" 2>/dev/null | tail -1 | tr -d '\r')
RS=$($DK inspect -f '{{.RestartCount}}' nabdah-meilisearch 2>/dev/null)
say "engine documents=$DOCS mongo=$WANTED meili_restarts=$RS"
DIRS=$(sudo -n sh -c "ls -1d $B/meili-data-old-* $B/meili-data-fresh-* 2>/dev/null")
[ -n "$DIRS" ] || { say "nothing to remove"; exit 0; }
for d in $DIRS; do say "found $(basename "$d") $(sudo -n du -sh "$d" 2>/dev/null | cut -f1)"; done
case "$WANTED" in ''|*[!0-9]*) say "ABORT mongo count unreadable: nothing removed"; exit 1;; esac
[ "$DOCS" = "$WANTED" ] && [ "$WANTED" -gt 0 ] || { say "ABORT engine does not hold all documents: nothing removed"; exit 1; }
[ "$RS" = 0 ] || { say "ABORT meilisearch restarted $RS time(s) since its start: nothing removed"; exit 1; }
[ "$APPLY" = yes ] || { say "dry run: would remove the dirs above"; exit 0; }
BEFORE=$(df -Pm / | awk 'NR==2{print $4}')
for d in $DIRS; do case "$(basename "$d")" in meili-data-old-*|meili-data-fresh-*) sudo -n rm -rf -- "$d" && say "removed $(basename "$d")";; esac; done
say "free on / before=${BEFORE} MB after=$(df -Pm / | awk 'NR==2{print $4}') MB"
