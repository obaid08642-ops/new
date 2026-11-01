#!/bin/bash
# ops-detach: the refill is watched for up to 12 minutes (longer than the 420 s non-detached limit).
# Meilisearch fresh start (run 77: 345 restarts in ~75 min at the 1 GB limit, 834 kills by its own memcg, anon_rss ~1 GB each time; 89,117 stale tasks
# enqueued, and the cancel cannot run because the engine dies within ~18 s of each start). The engine is a MIRROR: MongoDB `search_index` (21,311 docs)
# is the source of truth and the worker's paced boot sync (#2261, search.service.ts syncMeiliFromIndex + ensureIndex) re-sends it batch by batch.
# DRY RUN by default (prints what it would do). With APPLY=yes:
#   0. pre-checks: Mongo search_index holds > 0 documents; the meili data dir is known; nothing else holds the deploy lock
#   1. stop nabdah-meilisearch
#   2. MOVE (rename, same filesystem, no copy, no delete) the old data dir to /opt/nabdah/backups/meili-data-old-<ts>; create an empty data dir with the
#      same owner and mode
#   3. start nabdah-meilisearch; it must answer /health within 120 s, else ROLLBACK (stop, put the old dir back, start) and exit 1
#   4. restart nabdah-worker so its boot sync refills the engine from Mongo (paced, one batch at a time)
#   5. watch up to 12 min: documents vs Mongo, restarts, memory. OK when documents == Mongo and no restart happened.
# The old data dir is NOT deleted here; a later run removes it once search is confirmed healthy (owner-approved cleanup).
# ROLLBACK=yes APPLY=yes: stop meili, put the newest meili-data-old-* back in place (the fresh dir is moved aside, not deleted), start meili.
set -u
APPLY=${APPLY:-no}; ROLLBACK=${ROLLBACK:-no}
DK="sudo -n docker"; CT=nabdah-meilisearch; IDX=nabd_search
B=${OPS_BACKUP_DIR:-/opt/nabdah/backups}
LOCK=${NABD_DEPLOY_LOCK:-/opt/nabdah/deploy.lock}
TS=$(date -u +%Y%m%dT%H%M%SZ)
echo "## meili-fresh"
say() { echo "status: meili-fresh: $*"; }

JS='const u=process.env.MEILI_URL,k=process.env.MEILI_MASTER_KEY;const a=process.argv[1]||"docs";const h={Authorization:"Bearer "+k};
(async()=>{
 if(a==="health"){const r=await fetch(u+"/health");console.log(r.status===200?"up":"down");return}
 const r=await fetch(u+"/indexes/'$IDX'/stats",{headers:h});let j={};try{j=await r.json()}catch(e){}
 const t=await fetch(u+"/tasks?statuses=enqueued,processing&limit=1",{headers:h});let q={};try{q=await t.json()}catch(e){}
 console.log("http="+r.status+" documents="+(j.numberOfDocuments??"none")+" backlog="+(q.total??"?"));
})().catch(e=>console.log("down"))'
meili() { $DK exec nabdah-backend node -e "$JS" "$1" 2>/dev/null | tr -d '\r' | tail -1; }
restarts() { $DK inspect -f '{{.RestartCount}}' $CT 2>/dev/null; }
mem() { $DK stats --no-stream --format '{{.MemUsage}}' $CT 2>/dev/null; }
wait_up() { local i; for i in $(seq 1 24); do [ "$(meili health)" = up ] && return 0; sleep 5; done; return 1; }

MQ="print(db.getSiblingDB(process.env.DB_NAME||'nabd_nestjs').search_index.countDocuments({}))"
WANTED=$($DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$MQ" 2>/dev/null | tail -1 | tr -d '\r')
case "$WANTED" in ''|*[!0-9]*) WANTED=0;; esac
VOL=$($DK inspect -f '{{range .Mounts}}{{if eq .Destination "/meili_data"}}{{.Source}}{{end}}{{end}}' $CT 2>/dev/null)
say "before: state=$($DK inspect -f '{{.State.Status}}' $CT 2>/dev/null) restarts=$(restarts) memory=$(mem) data_dir=${VOL:-unknown} size=$([ -n "$VOL" ] && sudo -n du -sh "$VOL" 2>/dev/null | cut -f1) mongo_search_index=$WANTED engine: $(meili docs)"

if [ "$ROLLBACK" = yes ]; then
  OLD=$(sudo -n sh -c "ls -1d $B/meili-data-old-* 2>/dev/null | sort | tail -1")
  [ -n "$OLD" ] && [ -n "$VOL" ] || { say "ROLLBACK refused: no saved data dir ($OLD) or unknown data dir"; exit 1; }
  if [ "$APPLY" != yes ]; then say "dry run: would stop $CT, move $VOL aside to $B/meili-data-fresh-$TS, put $OLD back, start $CT"; exit 0; fi
  $DK stop -t 20 $CT >/dev/null 2>&1
  sudo -n mv "$VOL" "$B/meili-data-fresh-$TS" && sudo -n mv "$OLD" "$VOL" || { say "ROLLBACK FAILED at the move; data dirs: $VOL $OLD $B/meili-data-fresh-$TS"; exit 1; }
  $DK start $CT >/dev/null 2>&1; wait_up && say "ROLLBACK done: old data back, engine up" || say "ROLLBACK done: old data back, engine not answering yet"
  exit 0
fi

[ "$WANTED" -gt 0 ] || { say "ABORT: Mongo search_index holds no documents (or is unreadable): nothing to refill from, the engine is left as it is"; exit 1; }
[ -n "$VOL" ] && sudo -n test -d "$VOL" || { say "ABORT: the meili data dir is unknown"; exit 1; }
[ "$(sudo -n stat -c %d "$VOL")" = "$(sudo -n stat -c %d "$B")" ] || { say "ABORT: $B is on another filesystem than $VOL (the move would copy 2.7 GB): nothing changed"; exit 1; }
if [ "$APPLY" != yes ]; then
  say "dry run: would stop $CT, rename $VOL to $B/meili-data-old-$TS (no copy, no delete), start the engine empty, restart nabdah-worker so it re-sends $WANTED documents from Mongo, watch up to 12 min (APPLY=yes to do it)"
  exit 0
fi

OWN=$(sudo -n stat -c '%u:%g' "$VOL"); MODE=$(sudo -n stat -c '%a' "$VOL")
$DK stop -t 20 $CT >/dev/null 2>&1; say "1 stopped $CT"
sudo -n mv "$VOL" "$B/meili-data-old-$TS" || { say "ABORT: rename failed; starting $CT on its old data"; $DK start $CT >/dev/null 2>&1; exit 1; }
sudo -n mkdir "$VOL" && sudo -n chown "$OWN" "$VOL" && sudo -n chmod "$MODE" "$VOL" || { say "ABORT: could not create the empty dir; putting the old one back"; sudo -n rmdir "$VOL" 2>/dev/null; sudo -n mv "$B/meili-data-old-$TS" "$VOL"; $DK start $CT >/dev/null 2>&1; exit 1; }
say "2 old data dir renamed to $B/meili-data-old-$TS; empty data dir created ($OWN $MODE)"
$DK start $CT >/dev/null 2>&1
if ! wait_up; then
  say "3 FAILED: the engine did not answer /health in 120 s on an empty dir: ROLLBACK"
  $DK stop -t 20 $CT >/dev/null 2>&1; sudo -n mv "$VOL" "$B/meili-data-fresh-$TS"; sudo -n mv "$B/meili-data-old-$TS" "$VOL"; $DK start $CT >/dev/null 2>&1
  say "ROLLBACK done: old data back in place"; exit 1
fi
R0=$(restarts); say "3 engine up on an empty store: $(meili docs) restarts=$R0 memory=$(mem)"
$DK restart nabdah-worker >/dev/null 2>&1; say "4 nabdah-worker restarted: its boot sync re-sends $WANTED documents from Mongo"
DOCS=none
for i in $(seq 1 24); do
  sleep 30
  L=$(meili docs); DOCS=$(echo "$L" | sed -n 's/.*documents=\([0-9a-z]*\).*/\1/p')
  say "5 t+$((i*30))s: $L restarts=$(restarts) memory=$(mem)"
  [ "$DOCS" = "$WANTED" ] && break
done
R1=$(restarts)
say "worker sync log: $($DK logs --since 15m nabdah-worker 2>&1 | grep -iE 'meilisearch (holds|sync|already)' | tail -3 | sed -E 's/[0-9]{1,3}(\.[0-9]{1,3}){3}/<ip>/g' | tr '\n' ' ' | cut -c1-300)"
if [ "$DOCS" = "$WANTED" ] && [ "$R1" = "$R0" ]; then say "OK: engine holds $DOCS of $WANTED documents, no restart since the fresh start; old data kept at $B/meili-data-old-$TS for a later cleanup"
elif [ "$R1" != "$R0" ]; then say "WARN: the engine restarted $((R1-R0)) time(s) during the refill (documents=$DOCS of $WANTED); old data kept; ROLLBACK=yes APPLY=yes puts it back"
else say "PARTIAL: documents=$DOCS of $WANTED after 12 min, no restart; the worker keeps syncing; old data kept"; fi
say "done"
